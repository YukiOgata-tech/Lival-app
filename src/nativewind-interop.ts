// src/nativewind-interop.ts
import { cssInterop } from 'nativewind';
import {
  Card,
  Button,
  TextInput,
  RadioButton,
  Appbar,
  Checkbox,
  Avatar,
  List,
  Switch,
  Divider,
  Surface,
  FAB,
  Dialog,
  Snackbar,
  Chip,
  ProgressBar,
  Portal,
} from 'react-native-paper';
import { SafeAreaView, ScrollView, FlatList, SectionList } from 'react-native';

// Paper系UIコンポーネント（基本網羅）
cssInterop(Card, { className: 'style' });
cssInterop(Button, { className: 'style contentStyle labelStyle' }); // content/labelにも適用したい時
cssInterop(TextInput, { className: 'style' });
cssInterop(RadioButton, { className: 'style' });
cssInterop(Appbar, { className: 'style' });
cssInterop(Checkbox, { className: 'style' });
cssInterop(Avatar, { className: 'style' });
cssInterop(List, { className: 'style' });
cssInterop(Switch, { className: 'style' });
cssInterop(Divider, { className: 'style' });
cssInterop(Surface, { className: 'style' });
cssInterop(FAB, { className: 'style' });
cssInterop(Dialog, { className: 'style' });
cssInterop(Snackbar, { className: 'style' });
cssInterop(Chip, { className: 'style' });
cssInterop(ProgressBar, { className: 'style' });
cssInterop(Portal, { className: 'style' });

// 標準RN系も追加しておく
cssInterop(SafeAreaView, { className: 'style' });
cssInterop(ScrollView, { className: 'style' });
cssInterop(FlatList, { className: 'style' });
cssInterop(SectionList, { className: 'style' });

// PaperのButtonで「contentStyle」「labelStyle」も効かせたい場合
// <Button className="bg-blue-500" contentClassName="py-3" labelClassName="text-lg" />

