package main

import (
	"archive/zip"
	"compress/flate"
	"io"
	"sync"
	"syscall/js"
)

func main() {

	sync.OnceFunc(func() {
		zip.RegisterCompressor(zip.Deflate, func(w io.Writer) (io.WriteCloser, error) {
			return flate.NewWriter(w, flate.BestCompression)
		})
	})

	js.Global().Set("zipFileWASM", js.FuncOf(ZipFilesWASM))
	select {}
	// ReadText()
}
