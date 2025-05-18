$env:GOOS="js"; $env:GOARCH="wasm"; go build -o main.wasm .
cp ./main.wasm ../public/
rm ./main.wasm