import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';

interface AudioState {
  audio: HTMLAudioElement | null;
  playing: boolean;
}

const initialState: AudioState = {
  audio: null,
  playing: false,
};

const AudioContext = createContext<AudioState>(initialState);

interface AudioInitAction {
  type: 'INIT';
  audio: HTMLAudioElement;
}

interface AudioPlaybackAction {
  type: 'PLAY' | 'PAUSE' | 'TOGGLE';
}

interface AudioSetSrcAction {
  type: 'SET_SRC';
  src: string;
}

type AudioAction = AudioInitAction | AudioPlaybackAction | AudioSetSrcAction;

function audioReducer(state: AudioState, action: AudioAction) {
  if (action.type === 'INIT') return { ...state, audio: action.audio };
  if (!state.audio) return state;

  switch (action.type) {
    case 'PLAY':
      state.audio.play();
      return { ...state, playing: true };
    case 'PAUSE':
      state.audio.pause();
      return { ...state, playing: false };
    case 'TOGGLE':
      if (state.playing) {
        state.audio.pause();
      } else {
        state.audio.play();
      }
      return { ...state, playing: !state.playing };
    case 'SET_SRC':
      state.audio.src = action.src;
      state.audio.load();
      return state;
    default:
      return state;
  }
}

const AudioDispatchContext = createContext<Dispatch<AudioAction>>(
  () => undefined,
);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(audioReducer, initialState);
  const audio = useRef<HTMLAudioElement>(null);
  const hasAudioState = !!state.audio;

  useEffect(() => {
    if (hasAudioState || !audio.current) return;
    dispatch({ type: 'INIT', audio: audio.current });
  }, [hasAudioState]);

  return (
    <AudioContext.Provider value={state}>
      <AudioDispatchContext.Provider value={dispatch}>
        {children}
        {/* biome-ignore lint/a11y/useMediaCaption: it's music */}
        <audio ref={audio} onEnded={() => dispatch({ type: 'PAUSE' })} />
      </AudioDispatchContext.Provider>
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return [useContext(AudioContext), useContext(AudioDispatchContext)] as const;
}
