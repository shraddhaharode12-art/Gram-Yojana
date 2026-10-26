import Game from './components/Game';
import Home from './components/Home';
import { useStore } from './store';

export default function App() {
  const screen = useStore((s) => s.screen);
  return screen === 'home' ? <Home /> : <Game />;
}
