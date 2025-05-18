GOOS=js GOARCH=wasm go build -o app.wasm main.go
cp ./main.wasm ../public/
rm ./main.wasm