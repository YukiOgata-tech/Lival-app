// src/nativewind-interop.ts
import App from 'App';
import { cssInterop } from 'nativewind';
import { Card, Button, TextInput, RadioButton, Appbar } from 'react-native-paper';

// ここで Paper の主要 UI コンポーネントを列挙
cssInterop(Card, { className: 'style' });
cssInterop(Button, { className: 'style' });
cssInterop(TextInput, { className: 'style' });
cssInterop(RadioButton, { className: 'style' });
cssInterop(Appbar, { className: 'style' });
