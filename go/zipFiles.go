package main

import (
	"archive/zip"
	"bytes"
	"io"
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

	defer zipper.Close()

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

func UnzipFilesWASM(this js.Value, args []js.Value) any {
	blob := args[0]
	zippedData := make([]byte, blob.Get("length").Int())

	js.CopyBytesToGo(zippedData, blob)

	reader, err := zip.NewReader(bytes.NewReader(zippedData), int64(len(zippedData)))

	if err != nil {
		js.Global().Get("console").Call("error", "Zip error:", err.Error())
		return nil
	}
	jsMap := js.Global().Get("Map").New()

	for _, file := range reader.File {
		f, err := file.Open()

		if err != nil {
			js.Global().Get("console").Call("error", "File open error:", err.Error())
			continue
		}

		var buf bytes.Buffer

		if _, err := io.Copy(&buf, f); err != nil {
			f.Close()
			js.Global().Get("console").Call("error", "File read error:", err.Error())
			continue

		}

		f.Close()

		jsFileBytes := js.Global().Get("Uint8Array").New(buf.Len())
		js.CopyBytesToJS(jsFileBytes, buf.Bytes())

		jsMap.Call("set", file.Name, jsFileBytes)

	}
	return jsMap
}

func ZipFilesWASM(this js.Value, args []js.Value) any {
	jsFiles := args[0]

	zippedBytes := zipFiles(jsFiles)
	result := js.Global().Get("Uint8Array").New(len(zippedBytes))
	js.CopyBytesToJS(result, zippedBytes)

	return result
}
