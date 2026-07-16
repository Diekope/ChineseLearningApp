from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".js": "text/javascript",
        ".svg": "image/svg+xml",
    }


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 4173), Handler)
    print("ChineseLearn is running at http://127.0.0.1:4173")
    server.serve_forever()
