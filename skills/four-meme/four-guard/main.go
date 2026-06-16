package main

import (
	"context"
	"log"
	"math/big"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	gethtypes "github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/joho/godotenv"
)

// NOTE: This is a compact, readable implementation intended for testing.
// It intentionally omits some micro-optimizations from the earlier drafts.
// DO NOT put your private key in source code. Use .env file.

var (
	ChainID     = big.NewInt(56)
	FactoryAddr = common.HexToAddress("0xca143ce32fe78f1f7019d7d551a6402fc5350c73")
	RouterAddr  = common.HexToAddress("0x10ED43C718714eb63d5aA57B78B54704E256024E")
	WBNB        = common.HexToAddress("0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c")
)

const factoryABIJson = `[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token0","type":"address"},{"indexed":true,"internalType":"address","name":"token1","type":"address"},{"indexed":false,"internalType":"address","name":"pair","type":"address"},{"indexed":false,"internalType":"uint256","name":"","type":"uint256"}],"name":"PairCreated","type":"event"}]`

const erc20ABIJson = `[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":""}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":""}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":""}],"stateMutability":"view","type":"function"}]`


type Config struct {
	WssEndpoints []string
	HttpBroadcasts []string
	PrivateKey string
	SpendBNB string
	MinLiqBNB string
	SlippageBps int64
	DryRun bool
	OnlyWbnb bool
	SellCooldownMs int64
}

func loadConfig() *Config {
	_ = godotenv.Load()
	ws := splitCSV(os.Getenv("WSS_ENDPOINTS"))
	http := splitCSV(os.Getenv("HTTP_BROADCASTS"))
	pk := os.Getenv("PRIVATE_KEY")
	dry := strings.ToLower(os.Getenv("DRY_RUN"))=="true"
	only := strings.ToLower(os.Getenv("ONLY_WBNB_PAIRS"))!="false"
	return &Config{
		WssEndpoints: ws,
		HttpBroadcasts: http,
		PrivateKey: pk,
		SpendBNB: os.Getenv("SPEND_BNB"),
		MinLiqBNB: os.Getenv("MIN_LIQ_BNB"),
		SlippageBps: int64(mustInt("SLIPPAGE_BPS",300)),
		DryRun: dry,
		OnlyWbnb: only,
		SellCooldownMs: mustInt("SELL_COOLDOWN_MS",0),
	}
}

func splitCSV(s string) []string {
	var out []string
	for _, p := range strings.Split(strings.TrimSpace(s), ",") {
		p = strings.TrimSpace(p)
		if p!="" { out = append(out, p) }
	}
	return out
}
func mustInt(k string, def int64) int64 {
	raw := strings.TrimSpace(os.Getenv(k))
	if raw=="" { return def }
	v, err := strconv.ParseInt(raw,10,64)
	if err!=nil { return def }
	return v
}

func main() {
	cfg := loadConfig()
	if len(cfg.WssEndpoints)==0 {
		log.Fatal("No WSS endpoints configured in .env (WSS_ENDPOINTS)")
	}
	// parse ABIs (currently not used in this simplified version)
	// factoryABI := mustParseABI(factoryABIJson)
	// erc20ABI := mustParseABI(erc20ABIJson)

	// prepare WS clients (use the first for calls)
	var clients []*ethclient.Client
	for _, u := range cfg.WssEndpoints {
		c, err := ethclient.Dial(u)
		if err != nil {
			log.Println("WS dial err:", u, err)
			continue
		}
		clients = append(clients, c)
	}
	if len(clients)==0 {
		log.Fatal("no working WS clients")
	}
	primary := clients[0]

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func(){
		sig := make(chan os.Signal,1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		log.Println("shutting down")
		cancel()
	}()

	// Subscribe PairCreated (merged across WS clients - simple approach: subscribe on primary)
	q := ethereum.FilterQuery{
		Addresses: []common.Address{FactoryAddr},
		Topics: [][]common.Hash{{crypto.Keccak256Hash([]byte("PairCreated(address,address,address,uint256)"))}},
	}
	logs := make(chan gethtypes.Log, 1024)
	sub, err := primary.SubscribeFilterLogs(ctx, q, logs)
	if err!=nil {
		log.Fatal("PairCreated subscribe err:", err)
	}
	log.Println("subscribed to PairCreated, listening...")

	// state for sell-once per token
	var soldMap sync.Map

	for {
		select {
		case <-ctx.Done(): 
			sub.Unsubscribe()
			return
		case ev := <-logs:
			go func(ev gethtypes.Log){
				// raw debug
				log.Printf("[RAW] topics=%v data=%x", ev.Topics, ev.Data)
				// parse tokens: topics[1]=token0 topics[2]=token1, pair in data[0:32]
				if len(ev.Topics) < 3 || len(ev.Data) < 32 {
					log.Println("unexpected PairCreated log shape")
					return
				}
				t0 := common.BytesToAddress(ev.Topics[1].Bytes())
				t1 := common.BytesToAddress(ev.Topics[2].Bytes())
				pair := common.BytesToAddress(ev.Data[:32])
				// determine token (non-WBNB)
				var token common.Address
				if strings.EqualFold(t0.Hex(), WBNB.Hex()) { token = t1 } else if strings.EqualFold(t1.Hex(), WBNB.Hex()) { token = t0 } else {
					if cfg.OnlyWbnb {
						log.Println("pair not WBNB pair, skip")
						return
					}
					token = t0 // fallback
				}
				log.Printf("[PAIR] token=%s pair=%s tx=%s", token.Hex(), pair.Hex(), ev.TxHash.Hex())

				// quick check: avoid double processing
				if _, ok := soldMap.Load(token.Hex()); ok {
					log.Println("already processed token", token.Hex())
					return
				}

				// Here you would implement: buy -> approve -> start dev monitor (dev from tx)
				// For safety, we only log if DRY_RUN. In production, you would construct txs, sign and broadcast.
				if cfg.DryRun {
					log.Println("[DRY_RUN] would buy token", token.Hex())
				} else {
					// In a real run: build buy tx, send via broadcasters, then approveSelf, etc.
					log.Println("[ACTION] (stub) buy -> approve -> monitor dev")
				}

				// mark processed to avoid repeats
				soldMap.Store(token.Hex(), true)
			}(ev)
		}
	}
}
