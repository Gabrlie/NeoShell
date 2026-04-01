const XTERM_VERSION = '5.3.0';
const FIT_ADDON_VERSION = '0.11.0';

export function buildTerminalHtml(theme: {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
  fontSize: number;
  fontFamily: string;
  fontFaceCss?: string;
  fontStylesheetUrl?: string;
  letterSpacing: number;
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
    ${theme.fontStylesheetUrl ? `<link rel="stylesheet" href="${theme.fontStylesheetUrl}" />` : ''}
    <style>
      ${theme.fontFaceCss ?? ''}

      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: ${theme.background};
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }

      #terminal {
        width: 100%;
        height: 100%;
        padding: 8px 8px 0 8px;
        box-sizing: border-box;
        touch-action: manipulation;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }

      .xterm {
        height: 100%;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }

      .xterm-viewport,
      .xterm-screen {
        width: 100% !important;
      }

      .xterm,
      .xterm *,
      .xterm-helper-textarea {
        -webkit-touch-callout: none !important;
      }

      .xterm-rows,
      .xterm-screen canvas {
        font-variant-ligatures: none;
        font-feature-settings: "liga" 0, "calt" 0;
      }

      .xterm-rows {
        letter-spacing: ${theme.letterSpacing}px;
      }

      .xterm-helper-textarea {
        caret-color: transparent !important;
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
          document.addEventListener('contextmenu', function (event) {
            event.preventDefault();
          });

          function clearNativeSelection() {
            if (window.getSelection) {
              window.getSelection().removeAllRanges();
            }

            if (document.activeElement && typeof document.activeElement.blur === 'function') {
              document.activeElement.blur();
            }
          }

          var term = new window.Terminal({
            // Keep logical soft wraps intact so backspace can traverse wrapped command lines.
            convertEol: false,
            cursorBlink: true,
            fontFamily: ${JSON.stringify(theme.fontFamily)},
            fontSize: ${theme.fontSize},
            letterSpacing: ${theme.letterSpacing},
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

          function refreshTerminalFontMetrics() {
            term.options.fontFamily = ${JSON.stringify(theme.fontFamily)};
            term.options.fontSize = ${theme.fontSize};
            term.options.letterSpacing = ${theme.letterSpacing};
            fitAddon.fit();
          }

          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function () {
              refreshTerminalFontMetrics();
            });
          }

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
            getPlainText: function () {
              var buffer = term.buffer.active;
              var lines = [];
              for (var i = 0; i < buffer.length; i++) {
                var line = buffer.getLine(i);
                if (line) {
                  lines.push(line.translateToString(true));
                }
              }
              // Trim trailing empty lines
              while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
                lines.pop();
              }
              return lines.join('\\n');
            },
            paste: function (text) {
              term.paste(text);
            },
          };

          post('ready');

          // Long-press detection for paste/copy context menu
          var longPressTimer = null;
          terminalRoot.addEventListener('touchstart', function (e) {
            var touch = e.touches[0];
            var startX = touch.pageX;
            var startY = touch.pageY;
            longPressTimer = setTimeout(function () {
              longPressTimer = null;
              clearNativeSelection();
              if (typeof term.blur === 'function') {
                term.blur();
              }
              post('longpress', JSON.stringify({ x: startX, y: startY }));
            }, 500);
          }, { passive: true });
          terminalRoot.addEventListener('touchmove', function () {
            if (longPressTimer) {
              clearTimeout(longPressTimer);
              longPressTimer = null;
            }
          }, { passive: true });
          terminalRoot.addEventListener('touchend', function () {
            if (longPressTimer) {
              clearTimeout(longPressTimer);
              longPressTimer = null;
            }
          }, { passive: true });
          terminalRoot.addEventListener('touchcancel', function () {
            if (longPressTimer) {
              clearTimeout(longPressTimer);
              longPressTimer = null;
            }
          }, { passive: true });
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
