import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface AccountEntry {
  id: string;
  email: string;
  password: string;
  token: string;
  status: "valid" | "invalid" | "error" | "pending";
  createdAt: number;
}

export interface Settings {
  accountCount: number;
  customPassword: string;
  useCustomPassword: boolean;
  autoCaptcha: boolean;
  nopechaKey: string;
  darkMode: boolean;
}

interface AppContextValue {
  accounts: AccountEntry[];
  settings: Settings;
  isGenerating: boolean;
  currentStep: string;
  generationProgress: number;
  addAccount: (acc: AccountEntry) => void;
  clearAccounts: () => void;
  updateSettings: (s: Partial<Settings>) => void;
  setIsGenerating: (b: boolean) => void;
  setCurrentStep: (s: string) => void;
  setGenerationProgress: (n: number) => void;
}

const defaultSettings: Settings = {
  accountCount: 1,
  customPassword: "",
  useCustomPassword: false,
  autoCaptcha: false,
  nopechaKey: "",
  darkMode: true,
};

const AppContext = createContext<AppContextValue | null>(null);

const ACCOUNTS_KEY = "@discordgen_accounts";
const SETTINGS_KEY = "@discordgen_settings";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState("Ready");
  const [generationProgress, setGenerationProgress] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [accsRaw, settingsRaw] = await Promise.all([
          AsyncStorage.getItem(ACCOUNTS_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);
        if (accsRaw) setAccounts(JSON.parse(accsRaw));
        if (settingsRaw) setSettings({ ...defaultSettings, ...JSON.parse(settingsRaw) });
      } catch {}
    })();
  }, []);

  const addAccount = useCallback((acc: AccountEntry) => {
    setAccounts((prev) => {
      const next = [acc, ...prev];
      AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearAccounts = useCallback(() => {
    setAccounts([]);
    AsyncStorage.removeItem(ACCOUNTS_KEY).catch(() => {});
  }, []);

  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...s };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        accounts,
        settings,
        isGenerating,
        currentStep,
        generationProgress,
        addAccount,
        clearAccounts,
        updateSettings,
        setIsGenerating,
        setCurrentStep,
        setGenerationProgress,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
