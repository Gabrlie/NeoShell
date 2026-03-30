import type { FileEditorLanguage } from '@/services/fileEditorService';

const CODEMIRROR_IMPORT_BASE = 'https://esm.sh';

function resolveLanguageLoaderSnippet(language: FileEditorLanguage) {
  switch (language) {
    case 'javascript':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-javascript@6.2.4')).javascript();`;
    case 'typescript':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-javascript@6.2.4')).javascript({ typescript: true });`;
    case 'json':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-json@6.0.2')).json();`;
    case 'yaml':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-yaml@6.1.2')).yaml();`;
    case 'markdown':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-markdown@6.3.4')).markdown();`;
    case 'python':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-python@6.2.1')).python();`;
    case 'html':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-html@6.4.11')).html();`;
    case 'css':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-css@6.3.1')).css();`;
    case 'xml':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-xml@6.1.0')).xml();`;
    case 'sql':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-sql@6.10.0')).sql();`;
    case 'php':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-php@6.0.2')).php();`;
    case 'java':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-java@6.0.2')).java();`;
    case 'go':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-go@6.0.2')).go();`;
    case 'rust':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-rust@6.0.1')).rust();`;
    case 'cpp':
      return `return (await import('${CODEMIRROR_IMPORT_BASE}/@codemirror/lang-cpp@6.0.3')).cpp();`;
    default:
      return 'return null;';
  }
}

export function buildFileEditorHtml(theme: {
  language: FileEditorLanguage;
  background: string;
  foreground: string;
  accent: string;
  selection: string;
  gutter: string;
  border: string;
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
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: ${theme.background};
      }

      #editor {
        width: 100%;
        height: 100%;
      }

      textarea.neoshell-fallback {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        border: 0;
        outline: none;
        resize: none;
        padding: 16px 16px 24px;
        background: ${theme.background};
        color: ${theme.foreground};
        font: 14px/1.5 Menlo, Consolas, monospace;
      }
    </style>
  </head>
  <body>
    <div id="editor"></div>
    <script type="module">
      (async function () {
        const root = document.getElementById('editor');
        let savedValue = '';
        let getValue = () => '';
        let setValue = () => {};
        let focusEditor = () => {};

        function post(type, payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
          }
        }

        function emitDirtyChange() {
          post('change', {
            dirty: getValue() !== savedValue,
          });
        }

        function exposeApi() {
          window.NeoShellFileEditor = {
            setContent: function (value, markSaved) {
              setValue(String(value ?? ''));
              if (markSaved) {
                savedValue = getValue();
              }
              emitDirtyChange();
            },
            requestContent: function (requestId) {
              post('content', {
                requestId: requestId,
                value: getValue(),
              });
            },
            focus: function () {
              focusEditor();
            },
            markSaved: function () {
              savedValue = getValue();
              emitDirtyChange();
            },
          };
        }

        function initFallback(reason) {
          root.innerHTML = '';
          const textarea = document.createElement('textarea');
          textarea.className = 'neoshell-fallback';
          textarea.spellcheck = false;
          textarea.autocapitalize = 'off';
          textarea.autocomplete = 'off';
          textarea.autocorrect = 'off';
          textarea.addEventListener('input', emitDirtyChange);
          root.appendChild(textarea);

          getValue = function () {
            return textarea.value;
          };
          setValue = function (value) {
            textarea.value = value;
          };
          focusEditor = function () {
            textarea.focus();
          };

          exposeApi();
          post('ready', { fallback: true, reason: reason || null });
        }

        async function loadLanguageExtension(language) {
${resolveLanguageLoaderSnippet(theme.language)
  .split('\n')
  .map((line) => `          ${line}`)
  .join('\n')}
        }

        try {
          const [{ EditorState }, { EditorView }, { basicSetup }, languagePkg] = await Promise.all([
            import('${CODEMIRROR_IMPORT_BASE}/@codemirror/state@6.5.2'),
            import('${CODEMIRROR_IMPORT_BASE}/@codemirror/view@6.38.6'),
            import('${CODEMIRROR_IMPORT_BASE}/codemirror@6.0.1'),
            import('${CODEMIRROR_IMPORT_BASE}/@codemirror/language@6.11.3'),
          ]);

          const languageExtension = await loadLanguageExtension(${JSON.stringify(theme.language)});
          const extensions = [
            basicSetup,
            languagePkg.syntaxHighlighting(languagePkg.defaultHighlightStyle, { fallback: true }),
            EditorView.updateListener.of(function (update) {
              if (update.docChanged) {
                emitDirtyChange();
              }
            }),
            EditorView.theme({
              '&': {
                height: '100%',
                backgroundColor: ${JSON.stringify(theme.background)},
                color: ${JSON.stringify(theme.foreground)},
                fontSize: '14px',
              },
              '.cm-scroller': {
                overflow: 'auto',
                fontFamily: 'Menlo, Consolas, monospace',
                lineHeight: '1.5',
                padding: '12px 0 24px',
              },
              '.cm-content': {
                padding: '0 16px',
                caretColor: ${JSON.stringify(theme.accent)},
              },
              '.cm-focused': {
                outline: 'none',
              },
              '.cm-gutters': {
                backgroundColor: ${JSON.stringify(theme.gutter)},
                color: ${JSON.stringify(theme.foreground)},
                borderRight: '1px solid ${theme.border}',
              },
              '.cm-activeLine': {
                backgroundColor: ${JSON.stringify(theme.selection)},
              },
              '.cm-selectionBackground': {
                backgroundColor: ${JSON.stringify(theme.selection)} + ' !important',
              },
              '&.cm-focused .cm-cursor': {
                borderLeftColor: ${JSON.stringify(theme.accent)},
              },
            }),
          ];

          if (languageExtension) {
            extensions.push(languageExtension);
          }

          const view = new EditorView({
            state: EditorState.create({
              doc: '',
              extensions,
            }),
            parent: root,
          });

          getValue = function () {
            return view.state.doc.toString();
          };

          setValue = function (value) {
            view.dispatch({
              changes: {
                from: 0,
                to: view.state.doc.length,
                insert: value,
              },
            });
          };

          focusEditor = function () {
            view.focus();
          };

          exposeApi();
          post('ready', { fallback: false });
        } catch (error) {
          initFallback(error && error.message ? error.message : String(error));
        }
      })();
      true;
    </script>
  </body>
</html>
`.trim();
}
