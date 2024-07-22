package main

import (
	"fmt"
	"io"
	"os"
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// 定义响应结构体
type Response struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"` // 成功时返回数据
}

// 限制器
var limiter = rate.NewLimiter(8, 8) // 每秒最多 8 个请求

func main() {
	router := gin.Default()

	// 设置静态文件目录
	router.Use(static.Serve("/", static.LocalFile("./ui/build", true)))

	// api
	api := router.Group("/api").Use(cors.Default()).Use(limitRate)
	api.GET("/v1/generate", randomHandler)

	fmt.Println("Server started on port 8080")
	router.Run(":8080")
}

func randomHandler(c *gin.Context) {
	// 解析请求参数
	dataType := c.Query("type")
	if dataType != "uint8" && dataType != "uint16" && dataType != "uint32" {
		writeErrorResponse(c, "Invalid type parameter")
		return
	}

	length, err := strconv.Atoi(c.Query("length"))
	// 限制一次最大读取 64 字节的数据
	if err != nil || length < 1 || (dataType == "uint8" && length > 64) || (dataType == "uint16" && length > 32) || (dataType == "uint32" && length > 16) {
		writeErrorResponse(c, "Invalid length parameter")
		return
	}

	// 生成随机数
	randomNumbers, err := generateRandomNumbers(length, dataType)
	if err != nil {
		writeErrorResponse(c, err.Error())
		return
	}

	// 返回成功结果
	writeSuccessResponse(c, randomNumbers)
}

func generateRandomNumbers(length int, dataType string) ([]uint32, error) {
	// 打开 /dev/random 设备
	f, err := os.Open("/dev/random")
	if err != nil {
		return nil, fmt.Errorf("failed to open /dev/random: %w", err)
	}
	defer f.Close()

	// 生成随机数
	var randomNumbers []uint32
	for i := 0; i < length; i++ {
		var randomNumber uint32
		switch dataType {
		case "uint8":
			var buf [1]byte
			if _, err := io.ReadFull(f, buf[:]); err != nil {
				return nil, fmt.Errorf("failed to read from /dev/random: %w", err)
			}
			randomNumber = uint32(buf[0])
		case "uint16":
			var buf [2]byte
			if _, err := io.ReadFull(f, buf[:]); err != nil {
				return nil, fmt.Errorf("failed to read from /dev/random: %w", err)
			}
			randomNumber = uint32(buf[0])<<8 | uint32(buf[1])
		case "uint32":
			var buf [4]byte
			if _, err := io.ReadFull(f, buf[:]); err != nil {
				return nil, fmt.Errorf("failed to read from /dev/random: %w", err)
			}
			randomNumber = uint32(buf[0])<<24 | uint32(buf[1])<<16 | uint32(buf[2])<<8 | uint32(buf[3])
		}
		randomNumbers = append(randomNumbers, randomNumber)
	}

	return randomNumbers, nil
}

// 写入成功响应
func writeSuccessResponse(c *gin.Context, data interface{}) {
	response := Response{
		Code:    "Success",
		Message: "调用成功",
		Data:    data,
	}
	c.JSON(200, response)
}

// 写入错误响应
func writeErrorResponse(c *gin.Context, message string) {
	response := Response{
		Code:    "Error",
		Message: message,
	}
	c.JSON(200, response)
}

// 限流中间件
func limitRate(c *gin.Context) {
	if !limiter.Allow() {
		writeErrorResponse(c, "Too many requests")
		c.Abort()
		return
	}

	c.Next()
}
