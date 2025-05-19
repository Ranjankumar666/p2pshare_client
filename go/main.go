package main

import (
	"syscall/js"
)

func main() {

	js.Global().Set("zipFileWASM", js.FuncOf(ZipFilesWASM))
	js.Global().Set("unzipFileWASM", js.FuncOf(UnzipFilesWASM))
	select {}
	// ReadText()
}
