import React, { useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { isDemoMode, isProductionMode } from '../config';
import { useSession } from '../session';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useSession();

  const handleLogin = async () => {
    if (isProductionMode && (!email.trim() || !senha)) return Alert.alert('Preencha e-mail e senha');
    setSubmitting(true);
    try { await login({ email: email.trim(), password: senha }); }
    catch (error) { Alert.alert('Não foi possível entrar', error.message); }
    finally { setSubmitting(false); }
  };

  return (
    <ImageBackground
      source={require('../../assets/legacy/assets_images_fundo3.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar style="light" />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Image
            source={require('../../assets/ctbx-payments-logo.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.welcome}>Acesse sua conta</Text>
          {isDemoMode ? <Text style={styles.demoNotice}>Ambiente de demonstração · nenhuma operação bancária real</Text> : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>E-MAIL</Text>

            <View style={styles.inputBox}>
              <Text style={styles.icon}>✉</Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="digite seu e-mail"
                placeholderTextColor="#687278"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>SENHA</Text>

            <View style={styles.inputBox}>
              <Text style={styles.icon}>◉</Text>

              <TextInput
                value={senha}
                onChangeText={setSenha}
                placeholder="digite sua senha"
                placeholderTextColor="#687278"
                keyboardType="numeric"
                secureTextEntry={!mostrarSenha}
                maxLength={6}
                style={styles.input}
              />

              <TouchableOpacity
                onPress={() => setMostrarSenha(!mostrarSenha)}
                style={styles.eyeButton}
              >
                <Text style={styles.eye}>
                  {mostrarSenha ? '◉' : '◎'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgot}>
            <Text style={styles.forgotText}>Esqueceu sua senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={submitting}
            style={styles.loginButton}
            // DEMO ONLY / BACKEND REQUIRED: produção não possui bypass.
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>{submitting ? 'ENTRANDO…' : isDemoMode ? 'ENTRAR NO MODO DEMONSTRAÇÃO' : 'ENTRAR'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#0A0E12',
  },

  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
    width: '90%',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    width: '96%',
    maxWidth: 420,
    height: 180,
    marginBottom: 20,
  },

  welcome: {
    color: '#DDE5E8',
    fontSize: 18,
    fontWeight: '300',
    marginBottom: 28,
    textAlign: 'center',
  },
  demoNotice: { color: '#FFB45B', fontSize: 11, marginBottom: 18, textAlign: 'center' },

  fieldGroup: {
    width: '100%',
    marginBottom: 15,
  },

  label: {
    color: '#A7B0B5',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.6,
    marginBottom: 7,
    marginLeft: 4,
  },

  inputBox: {
    width: '100%',
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },

  icon: {
    color: '#7E8A90',
    fontSize: 20,
    width: 30,
  },

  input: {
    flex: 1,
    color: '#E6ECEF',
    fontSize: 15,
  },

  eyeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eye: {
    color: '#7E8A90',
    fontSize: 20,
  },

  forgot: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: 2,
  },

  forgotText: {
    color: '#A7B0B5',
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 8,
  },

  loginButton: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    backgroundColor: '#2F5B62',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
