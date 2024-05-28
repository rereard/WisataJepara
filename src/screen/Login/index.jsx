import { StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from "react-native";
import { colors } from "../../utility/colors";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useState } from "react";
import auth from '@react-native-firebase/auth';
import Spinner from "react-native-loading-spinner-overlay";

export default function Login({ navigation, route }) {

  const [showPass, setShowPass] = useState(true)
  const [iconEye, setIconEye] = useState('eye-off-outline');
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false)

  const ShowPw = () => {
    if (showPass === false) {
      setIconEye('eye-off-outline');
      setShowPass(!showPass);
    } else {
      setIconEye('eye-outline');
      setShowPass(false);
    }
  };

  return (
    <View
      style={styles.page}
    >
      <Spinner
        visible={loading}
        textContent="Loading..."
      />
      <View
        style={styles.content}
      >
        <Text style={styles.title}>LOGIN ADMIN</Text>
        <Text style={styles.text}>Silahkan masuk untuk mengakses halaman admin</Text>
        <View style={styles.Input}>
          <Text style={styles.inputHeader}>Email:</Text>
          <View>
            <TextInput
              style={styles.inputText('email')}
              placeholder="Masukkan email"
              placeholderTextColor={colors.darkGrey}
              onChangeText={value => setEmail(value)}
              value={email}
            />
            <Ionicons name={'mail-outline'} style={styles.icon('email')} />
          </View>
          <View style={{ height: 10 }}></View>
          <Text style={styles.inputHeader}>Password</Text>
          <View>
            <TextInput
              style={styles.inputText('password')}
              placeholder="Masukkan password"
              placeholderTextColor={colors.darkGrey}
              secureTextEntry={showPass}
              onChangeText={value => setPassword(value)}
              value={password}
            />
            <Ionicons name={'key-outline'} style={styles.icon('email')} />
            <Ionicons name={iconEye} style={styles.icon('password')} onPress={ShowPw} />
          </View>
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: colors.yellow,
            borderRadius: 15,
            alignItems: 'center',
            paddingVertical: 10,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            marginTop: 10
          }}
          onPress={() => {
            if (email !== '' && password !== '') {
              setLoading(true)
              auth().signInWithEmailAndPassword(email, password).then(() => {
                ToastAndroid.show('Berhasil Masuk', ToastAndroid.SHORT)
                setLoading(false)
                navigation.navigate('HomeAdmin')
              }).catch(e => {
                console.log(e.code);
                switch (e.code) {
                  case 'auth/invalid-email':
                    ToastAndroid.show('Format email salah', ToastAndroid.SHORT)
                    break;
                  case 'auth/user-disabled':
                    ToastAndroid.show('Akun telah dinontaktifkan', ToastAndroid.SHORT)
                    break;
                  case 'auth/user-not-found':
                    ToastAndroid.show('Tidak ditemukan akun dengan email ini', ToastAndroid.SHORT)
                    break;
                  case 'auth/invalid-credential':
                    ToastAndroid.show('Email/Password salah', ToastAndroid.SHORT)
                    break;
                  case 'auth/network-request-failed':
                    ToastAndroid.show('Error jaringan. Coba lagi nanti', ToastAndroid.SHORT)
                    break;
                  default:
                    ToastAndroid.show('Terjadi kesalahan. Coba lagi nanti', ToastAndroid.SHORT)
                    break;
                }
                setLoading(false)
                setPassword('')
              })
            } else {
              ToastAndroid.show('Email/Password tidak boleh kosong', ToastAndroid.SHORT)
            }
          }}
        >
          <Text
            style={{
              color: colors.white,
              fontSize: 15,
              fontWeight: '700',
            }}
          >
            Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.darkBlue,
    flex: 1,
    padding: 40,
  },
  content: {
    flex: 1,
  },
  Input: {
    marginTop: 20,
    marginBottom: 15,
  },
  title: {
    fontSize: 40,
    color: colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  text: {
    fontSize: 16,
    marginTop: 5,
    color: colors.white,
    textAlign: 'center',
  },
  inputHeader: {
    color: colors.white,
    fontWeight: 'bold',
    marginBottom: 5,
    paddingLeft: 5
  },
  inputText: (type) => ({
    borderRadius: 10,
    backgroundColor: colors.white,
    paddingRight: type === 'password' ? 30 : 15,
    paddingLeft: 45,
    color: colors.black,
    borderWidth: 1,
    borderColor: colors.darkGrey,
  }),
  icon: (type) => ({
    position: 'absolute',
    right: type === 'email' ? null : 0,
    top: 0,
    fontSize: 20,
    padding: 14,
    color: type === 'email' ? colors.darkGrey : colors.black,
  })
});
