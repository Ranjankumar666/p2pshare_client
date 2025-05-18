package main

import (
	"archive/zip"
	"bytes"
	"syscall/js"
)

type FileProcess struct {
	fileName string
	fileData []byte
	ack      chan int
}

func processFile(fileManager chan FileProcess, returnChannel chan []byte) {
	var buf bytes.Buffer
	zipper := zip.NewWriter(&buf)

	for fm := range fileManager {
		fileBuffer, _ := zipper.Create(fm.fileName)
		fileBuffer.Write(fm.fileData)
		fm.ack <- 1
	}

	zipper.Close()
	returnChannel <- buf.Bytes()
}

func zipFiles(jsFiles js.Value) []byte {

	fileNames := js.Global().Get("Object").Call("keys", jsFiles)
	fileDatas := js.Global().Get("Object").Call("values", jsFiles)

	fileManager := make(chan FileProcess)
	zippedBufChannel := make(chan []byte)

	go processFile(fileManager, zippedBufChannel)

	for i := 0; i < fileNames.Length(); i++ {
		fileName, fileData := fileNames.Index(i), fileDatas.Index(i)

		data := make([]byte, fileData.Length())
		js.CopyBytesToGo(data, fileData)

		ack := make(chan int)
		fileManager <- FileProcess{fileName.String(), data, ack}
		<-ack
	}
	close(fileManager)

	res := <-zippedBufChannel

	return res
}

func ZipFilesWASM(this js.Value, args []js.Value) any {
	jsFiles := args[0]

	zippedBytes := zipFiles(jsFiles)
	result := js.Global().Get("Uint8Array").New(len(zippedBytes))
	js.CopyBytesToJS(result, zippedBytes)

	return result
}
