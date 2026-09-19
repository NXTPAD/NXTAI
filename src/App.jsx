import { useEffect, useRef, useState } from "react";

const NXT_LOGO = "https://raw.githubusercontent.com/NXTPAD/NXTPAD/main/assets/img/ChatGPT%20Image%20Sep%2019%2C%202026%2C%2003_49_14%20PM.png";

const models = [
  { id: "nxt-auto", name: "NXT Auto", detail: "Best model for the task" },
  { id: "nxt-reasoning", name: "NXT Reasoning", detail: "Complex reasoning & coding" },
  { id: "nxt-fast", name: "NXT Fast", detail: "Fast everyday responses" },
];

const starterPrompts = [
  { icon: "⌁", title: "Research", text: "Research a topic and give me a clear, sourced answer." },
  { icon: "</>", title: "Code", text: "Help me build, debug, or improve my code." },
  { icon: "◫", title: "Analyze", text: "Analyze a file, dataset, or spreadsheet for me." },
  { icon: "✦", title: "Create", text: "Help me create something from an idea." },
];

const projects = [
  { name: "NXT DEX", icon: "◇" },
  { name: "NXT PAD", icon: "△" },
  { name: "NXT CLOUD", icon: "☁" },
];

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("nxt-auto");
  const [modelOpen, setModelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [attached, setAttached] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  const selectedModel = models.find((item) => item.id === model) || models[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  function startNewChat() {
    setMessages([]);
    setInput("");
    setAttached([]);
    inputRef.current?.focus();
  }

  async function submitPrompt(prompt = input) {
    const clean = prompt.trim();
    if (!clean || streaming) return;
    const history = [...messages, { role: "user", text: clean }];
    setMessages((current) => [...current, { role: "user", text: clean, files: attached.map((file) => file.name) }, { role: "assistant", text: "" }]);
    setInput(""); setAttached([]); setStreaming(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, useWeb: toolsOpen, messages: history.map((item) => ({ role: item.role, content: item.text })) }),
      });
      if (!response.ok) throw new Error((await response.text()) || "AI service unavailable.");
      if (!response.body) throw new Error("Streaming is not supported by this connection.");
      const reader = response.body.getReader(), decoder = new TextDecoder();
      let buffer = "", answer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n"); buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const line = chunk.split("\n").find((item) => item.startsWith("data:"));
          if (!line) continue;
          const event = JSON.parse(line.slice(5).trim());
          if (event.type === "delta") {
            answer += event.text;
            setMessages((current) => {
              const next = [...current]; next[next.length - 1] = { ...next[next.length - 1], text: answer }; return next;
            });
          }
          if (event.type === "error") throw new Error(event.message);
        }
      }
    } catch (error) {
      setMessages((current) => {
        const next = [...current]; next[next.length - 1] = { ...next[next.length - 1], text: "NXT AI connection error: " + error.message }; return next;
      });
    } finally { setStreaming(false); }
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitPrompt();
    }
  }

  function addFiles(event) {
    const files = Array.from(event.target.files || []);
    if (files.length) setAttached((current) => [...current, ...files]);
    event.target.value = "";
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <button className="brand" onClick={startNewChat} aria-label="NXT AI home">
            <img className="brand-logo" src={NXT_LOGO} alt="NXT logo" />
            <span className="brand-name">AI</span>
          </button>
          <button className="new-chat" onClick={startNewChat}>
            <Icon>＋</Icon>
            <span>New chat</span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="section-label">Workspace</div>
          <button className="side-link active"><Icon>⌂</Icon>Chats</button>
          <button className="side-link"><Icon>▣</Icon>Projects</button>
          <button className="side-link"><Icon>◈</Icon>Files</button>
        </div>

        <div className="sidebar-section projects">
          <div className="section-label">NXT Ecosystem</div>
          {projects.map((project) => (
            <button className="side-link" key={project.name}>
              <Icon>{project.icon}</Icon>{project.name}
            </button>
          ))}
        </div>

        <div className="sidebar-section recent">
          <div className="section-label">Recent</div>
          <button className="conversation">NXT AI development</button>
          <button className="conversation">Build the new workspace</button>
          <button className="conversation">NXT ecosystem ideas</button>
        </div>

        <div className="sidebar-bottom">
          <button className="side-link"><Icon>⚙</Icon>Settings</button>
          <button className="account">
            <span className="avatar">N</span>
            <span className="account-copy">
              <strong>NXT</strong>
              <small>NXT Account</small>
            </span>
            <span className="account-more">•••</span>
          </button>
        </div>
      </aside>

      <div className="mobile-backdrop" onClick={() => setSidebarOpen(false)} />

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
          <div className="topbar-title">
            <span>NXT AI</span>
            <span className="status-dot" />
          </div>
          <div className="topbar-actions">
            <button className="topbar-button" title="Share">↗</button>
            <button className="topbar-button" title="More">•••</button>
          </div>
        </header>

        <section className={`chat-area ${messages.length ? "has-messages" : ""}`}>
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-mark">
                <img src={NXT_LOGO} alt="NXT logo" />
                <b>AI</b>
              </div>
              <p className="eyebrow">INTELLIGENCE FOR THE NXT ECOSYSTEM</p>
              <h1>How can I help?</h1>
              <p className="welcome-copy">
                Ask NXT AI to research, create, code, analyze files, or work with the NXT ecosystem.
              </p>

              <div className="starter-grid">
                {starterPrompts.map((item) => (
                  <button className="starter-card" key={item.title} onClick={() => submitPrompt(item.text)}>
                    <span className="starter-icon">{item.icon}</span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.text}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((message, index) => (
                <article className={`message-row ${message.role}`} key={index}>
                  {message.role === "assistant" && <div className="message-avatar"><img src={NXT_LOGO} alt="NXT" /></div>}
                  <div className="message-content">
                    <div className="message-label">{message.role === "user" ? "You" : "NXT AI"}</div>
                    <div className="message-text">{message.text}</div>
                    {message.files?.length > 0 && (
                      <div className="message-files">
                        {message.files.map((file) => <span key={file}>📎 {file}</span>)}
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {streaming && (
                <article className="message-row assistant">
                  <div className="message-avatar">NXT</div>
                  <div className="message-content">
                    <div className="message-label">NXT AI</div>
                    <div className="typing"><i /><i /><i /></div>
                  </div>
                </article>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <section className="composer-wrap">
          {attached.length > 0 && (
            <div className="attachments">
              {attached.map((file, index) => (
                <div className="attachment" key={`${file.name}-${index}`}>
                  <span>📎</span>
                  <span>{file.name}</span>
                  <button onClick={() => setAttached((current) => current.filter((_, i) => i !== index))}>×</button>
                </div>
              ))}
            </div>
          )}

          {toolsOpen && (
            <div className="tools-popover">
              <button><span>⌁</span><strong>Web search</strong><small>Search the latest information</small></button>
              <button><span>▣</span><strong>Deep research</strong><small>Research across multiple sources</small></button>
              <button><span>⌘</span><strong>Code</strong><small>Run and reason about code</small></button>
              <button><span>◉</span><strong>Vision</strong><small>Understand images and screenshots</small></button>
            </div>
          )}

          <div className="composer">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask NXT AI anything..."
              rows={1}
              aria-label="Message NXT AI"
            />
            <div className="composer-toolbar">
              <div className="composer-left">
                <input ref={fileRef} type="file" multiple hidden onChange={addFiles} accept=".pdf,.doc,.docx,.txt,.csv,.json,.md,image/*" />
                <button className="tool-button" onClick={() => fileRef.current?.click()} title="Attach files"><Icon>＋</Icon></button>
                <button className={`tool-button ${toolsOpen ? "selected" : ""}`} onClick={() => setToolsOpen((value) => !value)} title="Tools"><Icon>⌁</Icon><span>Tools</span></button>
              </div>

              <div className="composer-right">
                <div className="model-picker">
                  <button className="model-button" onClick={() => setModelOpen((value) => !value)}>
                    <span className="model-pulse" />
                    <span>{selectedModel.name}</span>
                    <span className="chevron">⌄</span>
                  </button>
                  {modelOpen && (
                    <div className="model-menu">
                      {models.map((item) => (
                        <button
                          key={item.id}
                          className={item.id === model ? "chosen" : ""}
                          onClick={() => { setModel(item.id); setModelOpen(false); }}
                        >
                          <span className="model-check">{item.id === model ? "✓" : ""}</span>
                          <span><strong>{item.name}</strong><small>{item.detail}</small></span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="send-button" disabled={!input.trim() || streaming} onClick={() => submitPrompt()} aria-label="Send message">↑</button>
              </div>
            </div>
          </div>
          <p className="composer-note">NXT AI can make mistakes. Verify important information.</p>
        </section>
      </main>
    </div>
  );
}

export default App;