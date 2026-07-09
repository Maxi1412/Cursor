import { useEffect, useRef, useState } from 'react';
import { Database, Sparkles, Check, Volume2, Mic, Send } from 'lucide-react';
import type { DeckAction, ProvenanceSource } from '@mediadeck/types';
import { useDeckMemory, useDeckChat, useClearDeckMemory } from '../../lib/queries';
import { useVoice } from '../../hooks/useVoice';
import { ProvenanceChips } from '../../components/ProvenanceChip';

const SUGGESTIONS = [
  "Any old-school action I'm missing?",
  'Recommend an action movie',
  'Move The Boys to the Comics folder',
  'Any new releases out on disc?',
];

const GREETING =
  "Hi Max — I'm Deck. Ask what you've got, what's missing, or for a recommendation. I can add things to Download Station too.";

/** Local heuristic for the typing indicator's note (server returns the real one on reply). */
function noteFor(t: string): string {
  const q = t.toLowerCase();
  if (q.includes('move') || q.includes('copy') || q.includes('folder')) return 'Reading folders…';
  if (
    q.includes('duplicate') ||
    q.includes('dupe') ||
    q.includes('corrupt') ||
    q.includes('broken') ||
    q.includes('organiz')
  )
    return 'Scanning library…';
  if (
    q.includes('miss') ||
    q.includes('add') ||
    q.includes('action') ||
    q.includes('download') ||
    q.includes('recommend') ||
    q.includes('release') ||
    q.includes('new')
  )
    return 'Checking Download Station & memory…';
  return 'Thinking…';
}

export function DeckTab() {
  const { data } = useDeckMemory();
  const chat = useDeckChat();
  const clear = useClearDeckMemory();
  const voice = useVoice();

  const [input, setInput] = useState('');
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [thinkingNote, setThinkingNote] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const memory = data?.memory ?? [];
  const typing = chat.isPending;
  const showGreeting = memory.length === 0;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [memory, typing, pendingUser]);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t || chat.isPending) return;
    setInput('');
    setPendingUser(t);
    setThinkingNote(noteFor(t));
    chat.mutate(t, {
      onSettled: () => setPendingUser(null),
    });
  };

  const runAction = (a: DeckAction) => ask(a.label);

  return (
    <div className="md-chat">
      <div className="md-memline">
        <Database size={14} /> <span>Deck remembers our past chats</span>
        <button onClick={() => clear.mutate()}>Clear</button>
      </div>

      {showGreeting && (
        <AiBubble
          id="greeting"
          text={GREETING}
          checked={[]}
          onSpeak={() => voice.speak(GREETING, 'greeting')}
          speaking={voice.speakingId === 'greeting'}
        />
      )}

      {memory.map((m) =>
        m.role === 'user' ? (
          <div key={m.id} className="md-msg user">
            {m.text}
          </div>
        ) : (
          <AiBubble
            key={m.id}
            id={m.id}
            text={m.text}
            checked={m.checked}
            action={m.action}
            onAction={runAction}
            onSpeak={() => voice.speak(m.text, m.id)}
            speaking={voice.speakingId === m.id}
          />
        ),
      )}

      {pendingUser && <div className="md-msg user">{pendingUser}</div>}

      {typing && (
        <div className="md-typing">
          <i />
          <i />
          <i />
          {thinkingNote && <span className="md-typing-note">{thinkingNote}</span>}
        </div>
      )}

      {showGreeting && !pendingUser && (
        <div className="md-suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="md-sug" onClick={() => ask(s)}>
              <Sparkles size={15} /> {s}
            </button>
          ))}
        </div>
      )}

      <div ref={chatEndRef} />

      <DeckInput
        input={input}
        listening={voice.listening}
        onInput={setInput}
        onSend={() => ask(input)}
        onMic={() => voice.toggleMic((tx) => setInput(tx))}
      />
    </div>
  );
}

interface AiBubbleProps {
  id: string;
  text: string;
  checked: ProvenanceSource[];
  action?: DeckAction;
  onAction?: (a: DeckAction) => void;
  onSpeak: () => void;
  speaking: boolean;
}

function AiBubble({ text, checked, action, onAction, onSpeak, speaking }: AiBubbleProps) {
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        maxWidth: '86%',
      }}
    >
      <div className="md-aihead">
        <div className="md-aidot">
          <Sparkles size={12} />
        </div>
        <div className="md-ainame">DECK</div>
      </div>
      <ProvenanceChips sources={checked} />
      <div className="md-msg ai">{text}</div>
      {action && onAction && (
        <div className="md-msg-actions">
          <button className="md-msg-act" onClick={() => onAction(action)}>
            <Check size={14} /> {action.label}
          </button>
        </div>
      )}
      <button className={`md-speak ${speaking ? 'on' : ''}`} onClick={onSpeak}>
        <Volume2 size={15} />
      </button>
    </div>
  );
}

interface DeckInputProps {
  input: string;
  listening: boolean;
  onInput: (v: string) => void;
  onSend: () => void;
  onMic: () => void;
}

function DeckInput({ input, listening, onInput, onSend, onMic }: DeckInputProps) {
  return (
    <div className="md-ai-input">
      <div className="md-ai-field">
        <input
          placeholder={listening ? 'Listening…' : 'Ask Deck anything'}
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSend();
          }}
        />
        <button
          className={`md-icobtn mic ${listening ? 'on' : ''}`}
          style={{ width: 34, height: 34, borderRadius: 10 }}
          onClick={onMic}
          aria-label="Voice input"
        >
          <Mic size={17} />
        </button>
      </div>
      <button className="md-icobtn send" onClick={onSend} aria-label="Send">
        <Send size={19} />
      </button>
    </div>
  );
}
