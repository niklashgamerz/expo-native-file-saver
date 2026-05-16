import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  checkAccessibilityService,
  requestAccessibilityService,
  solveCaptcha,
  STATUS_MESSAGES,
} from "@/lib/captchaSolver";
import { createEmail } from "@/lib/cybertemp";
import { generateDisplayName, generatePassword, generateUsername } from "@/lib/passwordGen";

const DISCORD_REGISTER = "https://discord.com/register";

// JS injected on every page load to watch for URL changes + hCaptcha
const WATCHER_JS = `
(function() {
  let captchaPosted = false;
  let lastUrl = location.href;

  setInterval(function() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'urlchange', url: location.href }));
    }
  }, 500);

  const obs = new MutationObserver(function() {
    const frame = document.querySelector('iframe[src*="hcaptcha.com"]');
    if (frame && !captchaPosted) {
      captchaPosted = true;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'captcha_detected' }));
    }
    if (!frame) captchaPosted = false;
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // Check immediately in case it's already there
  if (document.querySelector('iframe[src*="hcaptcha.com"]')) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'captcha_detected' }));
  }
  true;
})();
true;
`;

// JS to extract the Discord auth token after login
const TOKEN_EXTRACTOR_JS = `
(function() {
  function isToken(t) { return t && typeof t==='string' && t.length>50 && t.split('.').length===3; }
  var token = null;
  try {
    var t = window.localStorage.getItem('token');
    if (t) { t = t.replace(/"/g,''); if (isToken(t)) token = t; }
  } catch(e) {}
  if (!token) {
    try {
      var m = [];
      (window.webpackChunkdiscord_app||[]).push([['x'],{},function(e){ for(var c in e.c) m.push(e.c[c]); }]);
      var auth = m.find(function(x){ return x&&x.exports&&x.exports.default&&x.exports.default.getToken; });
      if (auth) { var tok = auth.exports.default.getToken(); if (isToken(tok)) token = tok; }
    } catch(e) {}
  }
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', token: token }));
})();
true;
`;

function buildFillFormJS(
  email: string,
  displayName: string,
  username: string,
  password: string
): string {
  return `
(function() {
  var email=${JSON.stringify(email)}, displayName=${JSON.stringify(displayName)},
      username=${JSON.stringify(username)}, password=${JSON.stringify(password)};

  function sleep(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  function typeInto(sel, val) {
    var el = document.querySelector(sel);
    if (!el) return false;
    el.focus();
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    setter.call(el, val);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function pickDropdown(ariaLabel, value) {
    var div = document.querySelector('div[aria-label="'+ariaLabel+'"]');
    if (!div) return;
    div.click();
    setTimeout(function(){
      var opts = document.querySelectorAll('div[class*="option"]');
      opts.forEach(function(o){ if(o.innerText&&o.innerText.trim().toLowerCase()===value.toLowerCase()) o.click(); });
    }, 400);
  }
  (async function() {
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'status',message:'Filling email...'}));
    typeInto('input[name="email"]', email);              await sleep(300);
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'status',message:'Filling display name...'}));
    typeInto('input[name="global_name"]', displayName);  await sleep(300);
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'status',message:'Filling username...'}));
    typeInto('input[name="username"]', username);         await sleep(300);
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'status',message:'Filling password...'}));
    typeInto('input[aria-label="Password"]', password);  await sleep(300);

    window.ReactNativeWebView.postMessage(JSON.stringify({type:'status',message:'Filling date of birth...'}));
    var months=['January','February','March','April','May','June','July','August','September','October','November','December'];
    pickDropdown('Month', months[Math.floor(Math.random()*12)]); await sleep(700);
    pickDropdown('Day',   String(1+Math.floor(Math.random()*27))); await sleep(700);
    pickDropdown('Year',  String(1990+Math.floor(Math.random()*13))); await sleep(700);

    // Accept terms checkbox if present
    document.querySelectorAll('input[type="checkbox"]').forEach(function(cb){
      if(!cb.checked){ cb.click(); cb.checked=true; cb.dispatchEvent(new Event('change',{bubbles:true})); }
    });
    await sleep(400);

    window.ReactNativeWebView.postMessage(JSON.stringify({type:'status',message:'Submitting — waiting for captcha...'}));
    var btn = document.querySelector('button[type="submit"]');
    if (btn) btn.click();
  })();
  true;
})();
true;
`;
}


export default function CreatorTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    settings, isGenerating, currentStep, addAccount,
    setIsGenerating, setCurrentStep, setGenerationProgress,
  } = useApp();

  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [webviewReady, setWebviewReady] = useState(false);
  const [captchaActive, setCaptchaActive] = useState(false);
  const [autoSolving, setAutoSolving] = useState(false);

  const emailRef = useRef("");
  const passwordRef = useRef("");
  const generatingRef = useRef(false);
  const solvingRef = useRef(false);
  const accountsDoneRef = useRef(0);
  const resolveWaitRef = useRef<(() => void) | null>(null);

  const goToRegister = useCallback(() => {
    setCaptchaActive(false);
    webViewRef.current?.injectJavaScript(
      `window.location.href = '${DISCORD_REGISTER}'; true;`
    );
  }, []);

  const injectJS = useCallback((js: string) => {
    webViewRef.current?.injectJavaScript(js);
  }, []);

  const runAutoCaptchaSolver = useCallback(async () => {
    if (solvingRef.current) return;
    solvingRef.current = true;
    setAutoSolving(true);

    // Combined: expo-pilot does the physical tapping, NopeCHA does the recognition
    await solveCaptcha(
      (status, msg) => setCurrentStep(msg ?? STATUS_MESSAGES[status]),
      injectJS,
      settings.nopechaKey || undefined
    );

    solvingRef.current = false;
    setAutoSolving(false);
  }, [settings.nopechaKey, setCurrentStep, injectJS]);

  const startGeneration = useCallback(async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    accountsDoneRef.current = 0;
    setIsGenerating(true);
    setGenerationProgress(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const total = settings.accountCount;

    for (let i = 0; i < total && generatingRef.current; i++) {
      setCurrentStep(`Account ${i + 1}/${total} — getting email...`);

      const username = generateUsername();
      const email = await createEmail(username);
      const password =
        settings.useCustomPassword && settings.customPassword
          ? settings.customPassword
          : generatePassword();
      const displayName = generateDisplayName();

      emailRef.current = email;
      passwordRef.current = password;

      setCurrentStep(`Account ${i + 1}/${total} — loading Discord...`);
      goToRegister();
      // Wait for page to load
      await new Promise((r) => setTimeout(r, 3500));
      if (!generatingRef.current) break;

      setCurrentStep(`Account ${i + 1}/${total} — filling form...`);
      webViewRef.current?.injectJavaScript(
        buildFillFormJS(email, displayName, username, password)
      );

      // Wait for either: token captured OR manual stop (up to 3 min)
      setCurrentStep(`Account ${i + 1}/${total} — waiting...`);
      await new Promise<void>((resolve) => {
        resolveWaitRef.current = resolve;
        setTimeout(resolve, 180_000); // 3-min timeout per account
      });
      resolveWaitRef.current = null;

      setGenerationProgress(Math.round(((i + 1) / total) * 100));
    }

    if (generatingRef.current) {
      setCurrentStep(`Done — ${accountsDoneRef.current} account(s) captured`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsGenerating(false);
    generatingRef.current = false;
  }, [
    settings, goToRegister, addAccount,
    setIsGenerating, setCurrentStep, setGenerationProgress,
  ]);

  const stopGeneration = useCallback(() => {
    generatingRef.current = false;
    solvingRef.current = false;
    setIsGenerating(false);
    setAutoSolving(false);
    setCaptchaActive(false);
    setCurrentStep("Stopped");
    resolveWaitRef.current?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [setIsGenerating, setCurrentStep]);

  const handleMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(e.nativeEvent.data);

        if (data.type === "status") {
          setCurrentStep(data.message);
        } else if (data.type === "captcha_detected") {
          setCaptchaActive(true);
          if (settings.autoCaptcha && !solvingRef.current) {
            runAutoCaptchaSolver();
          } else {
            setCurrentStep("Captcha detected — solve it to continue");
          }
        } else if (data.type === "urlchange") {
          const url: string = data.url;
          if (
            url.includes("discord.com/channels/@me") ||
            url.includes("channels/%40me")
          ) {
            setCaptchaActive(false);
            setCurrentStep("Registered! Extracting token...");
            setTimeout(() => {
              webViewRef.current?.injectJavaScript(TOKEN_EXTRACTOR_JS);
            }, 2000);
          }
        } else if (data.type === "token") {
          const tok: string | null = data.token;
          if (tok && tok.length > 50) {
            addAccount({
              id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
              email: emailRef.current,
              password: passwordRef.current,
              token: tok,
              status: "valid",
              createdAt: Date.now(),
            });
            accountsDoneRef.current += 1;
            setCurrentStep(`Token captured! (${accountsDoneRef.current}/${settings.accountCount})`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            resolveWaitRef.current?.(); // advance to next account
          }
        }
      } catch {}
    },
    [addAccount, settings, setCurrentStep, runAutoCaptchaSolver]
  );

  const topPad = Platform.OS === "web" ? 67 : 0;
  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      {/* Auto captcha banner */}
      {settings.autoCaptcha && (
        <View style={s.banner}>
          <Feather name="shield" size={12} color="#3ba55d" />
          <Text style={s.bannerText}>
            Auto Captcha: NopeCHA (recognition) + expo-pilot (tapping)
            {settings.nopechaKey ? " · key set" : " · free tier"}
          </Text>
        </View>
      )}

      <View style={s.webviewWrap}>
        {isLoading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s.loadingText}>Loading Discord...</Text>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: DISCORD_REGISTER }}
          style={s.webview}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => {
            setIsLoading(false);
            setWebviewReady(true);
            webViewRef.current?.injectJavaScript(WATCHER_JS);
          }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        />

        {/* Captcha badge overlay */}
        {captchaActive && (
          <View style={s.badgeWrap}>
            <View style={s.badge}>
              {autoSolving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="lock" size={13} color="#fff" />
              )}
              <Text style={s.badgeText}>
                {autoSolving ? "NopeCHA solving..." : "Solve captcha"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Status bar */}
      <View style={[s.bar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={s.barLeft}>
          <View style={[
            s.dot,
            isGenerating ? (captchaActive ? s.dotCaptcha : s.dotActive) : s.dotIdle,
          ]} />
          <Text style={s.statusText} numberOfLines={1} ellipsizeMode="tail">
            {currentStep}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            s.btn,
            isGenerating ? s.btnStop : s.btnStart,
            pressed && { opacity: 0.75 },
            !webviewReady && { opacity: 0.4 },
          ]}
          onPress={isGenerating ? stopGeneration : startGeneration}
          disabled={!webviewReady}
        >
          <Feather name={isGenerating ? "square" : "play"} size={13} color="#fff" />
          <Text style={s.btnText}>{isGenerating ? "Stop" : "Start"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#3ba55d18",
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    bannerText: { fontSize: 11, color: "#3ba55d", fontFamily: "Inter_500Medium" },
    webviewWrap: { flex: 1, position: "relative" },
    webview: { flex: 1 },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.background,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
      zIndex: 10,
    },
    loadingText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
    badgeWrap: { position: "absolute", top: 12, right: 12, zIndex: 20 },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: "#5865f2ee",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    badgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
    bar: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 10,
      gap: 10,
    },
    barLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    dotActive: { backgroundColor: "#3ba55d" },
    dotIdle: { backgroundColor: "#72767d" },
    dotCaptcha: { backgroundColor: "#faa61a" },
    statusText: { flex: 1, color: c.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 20,
    },
    btnStart: { backgroundColor: "#5865f2" },
    btnStop: { backgroundColor: "#ed4245" },
    btnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  });
}
