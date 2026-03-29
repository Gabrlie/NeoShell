const XTERM_VERSION = '5.3.0';
const FIT_ADDON_VERSION = '0.11.0';

export function buildTerminalHtml(theme: {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
}) {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/xterm@${XTERM_VERSION}/css/xterm.min.css"
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: ${theme.background};
      }

      #terminal {
        width: 100%;
        height: 100%;
        padding: 8px 8px 0 8px;
        box-sizing: border-box;
        touch-action: manipulation;
      }

      .xterm {
        height: 100%;
      }

      .xterm-viewport,
      .xterm-screen {
        width: 100% !important;
      }
    </style>
  </head>
  <body>
    <div id="terminal"></div>
    <script src="https://cdn.jsdelivr.net/npm/xterm@${XTERM_VERSION}/lib/xterm.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@${FIT_ADDON_VERSION}/lib/addon-fit.min.js"></script>
    <script>
      (function () {
        function post(type, payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
          }
        }

        function initTerminal() {
          var terminalRoot = document.getElementById('terminal');
          var term = new window.Terminal({
            convertEol: true,
            cursorBlink: true,
            fontFamily: 'Menlo, Consolas, monospace',
            fontSize: 14,
            lineHeight: 1.3,
            theme: {
              background: '${theme.background}',
              foreground: '${theme.foreground}',
              cursor: '${theme.cursor}',
              selectionBackground: '${theme.selection}',
            },
          });
          var fitAddon = new window.FitAddon.FitAddon();
          term.loadAddon(fitAddon);
          term.open(terminalRoot);
          fitAddon.fit();
          term.focus();

          term.onData(function (data) {
            post('input', data);
          });

          window.addEventListener('resize', function () {
            fitAddon.fit();
          });

          function focusTerminal() {
            post('focus');
            term.focus();
          }

          window.NeoShellTerminal = {
            write: function (chunk) {
              term.write(chunk);
            },
            clear: function () {
              term.clear();
            },
            reset: function () {
              term.reset();
              fitAddon.fit();
            },
            fit: function () {
              fitAddon.fit();
            },
            focus: function () {
              focusTerminal();
            },
          };

          post('ready');
        }

        if (window.Terminal && window.FitAddon) {
          initTerminal();
        } else {
          window.addEventListener('load', initTerminal);
        }
      })();
      true;
    </script>
  </body>
</html>
`.trim();
}
