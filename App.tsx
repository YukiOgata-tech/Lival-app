// App.tsx  – 入口はこれだけ
import AppRouter from '@/navigation/Approuter';
import './global.css';
import './src/nativewind-interop';

export default function App() {
  return <AppRouter />;
}

