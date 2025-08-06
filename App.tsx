// App.tsx  – 入口はこれだけ
import AppRouter from '@/navigation/Approuter';
import './global.css';
import './src/nativewind-interop';

export default function App() {
  return <AppRouter />;
}

// App.tsx
// import React from 'react';
// import { Button, Text, View } from 'react-native';
// import { MMKV } from 'react-native-mmkv';

// const storage = new MMKV();

// export default function App() {
//   const [value, setValue] = React.useState('');

//   return (
//     <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
//       <Button
//         title="Set Value"
//         onPress={() => {
//           storage.set('testKey', 'MMKV is working!');
//           setValue(storage.getString('testKey') || '');
//         }}
//       />
//       <Button
//         title="Get Value"
//         onPress={() => {
//           setValue(storage.getString('testKey') || '');
//         }}
//       />
//       <Text style={{ fontSize: 18, marginTop: 24 }}>{value}</Text>
//     </View>
//   );
// }
