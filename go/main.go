package main

import (
	"syscall/js"
)

func main() {

	js.Global().Set("zipFileWASM", js.FuncOf(ZipFilesWASM))
	select {}
	// ReadText()
}
