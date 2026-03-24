import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, FlatList,
  KeyboardAvoidingView, Platform, useWindowDimensions, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { trpc } from '@/lib/trpc';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const SUGGESTED_QUESTIONS = [
  'Quais são os 5 riscos mais críticos?',
  'Onde investir primeiro para maior ROI?',
  'Resuma a exposição financeira total',
  'O que priorizar nos próximos 3 meses?',
  'Compare riscos internos vs externos',
  'Explique a metodologia ICAPT v5',
];

export function AIChatButton() {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 768;

  const chatMutation = trpc.ai.chat.useMutation();

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const result = await chatMutation.mutateAsync({
        message: text.trim(),
        history,
      });

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.reply,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua pergunta. Verifique sua conexão e tente novamente.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, chatMutation]);

  const handleSend = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  const handleSuggestion = useCallback((q: string) => {
    sendMessage(q);
  }, [sendMessage]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[cs.msgRow, isUser ? cs.msgRowUser : cs.msgRowAssistant]}>
        {!isUser && (
          <View style={cs.avatarAI}>
            <Text style={cs.avatarText}>🤖</Text>
          </View>
        )}
        <View style={[cs.msgBubble, isUser ? cs.msgBubbleUser : cs.msgBubbleAssistant]}>
          <Text style={[cs.msgText, isUser ? cs.msgTextUser : cs.msgTextAssistant]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  }, []);

  return (
    <>
      {/* Floating Button */}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={cs.fab}
        activeOpacity={0.8}
      >
        <Text style={cs.fabIcon}>🤖</Text>
        <View style={cs.fabBadge}>
          <Text style={cs.fabBadgeText}>IA</Text>
        </View>
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={cs.modalContainer}
        >
          <View style={[cs.chatCard, {
            maxWidth: isDesktop ? 480 : width - 16,
            maxHeight: isDesktop ? height * 0.75 : height * 0.85,
          }]}>
            {/* Chat Header */}
            <View style={cs.chatHeader}>
              <View style={cs.chatHeaderLeft}>
                <Text style={cs.chatHeaderIcon}>🤖</Text>
                <View>
                  <Text style={cs.chatHeaderTitle}>ASSISTENTE DE RISCOS</Text>
                  <Text style={cs.chatHeaderSubtitle}>Vetor Horizon • ICAPT v5</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} style={cs.closeBtn}>
                <IconSymbol name="xmark" size={18} color="#6B8A7A" />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={cs.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <View style={cs.emptyContainer}>
                  <Text style={cs.emptyIcon}>🎯</Text>
                  <Text style={cs.emptyTitle}>Assistente de Riscos</Text>
                  <Text style={cs.emptySubtitle}>
                    Faça perguntas sobre os 35 riscos da DAMACORP, priorização, investimentos e recomendações.
                  </Text>
                  <View style={cs.suggestionsGrid}>
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => handleSuggestion(q)}
                        style={cs.suggestionBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={cs.suggestionText}>{q}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              }
            />

            {/* Loading indicator */}
            {loading && (
              <View style={cs.loadingRow}>
                <View style={cs.avatarAI}>
                  <Text style={cs.avatarText}>🤖</Text>
                </View>
                <View style={cs.loadingBubble}>
                  <ActivityIndicator size="small" color="#00E5FF" />
                  <Text style={cs.loadingText}>Analisando riscos...</Text>
                </View>
              </View>
            )}

            {/* Input */}
            <View style={cs.inputRow}>
              <TextInput
                style={cs.textInput}
                placeholder="Pergunte sobre riscos..."
                placeholderTextColor="#4A5A6A"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                multiline={false}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={handleSend}
                style={[cs.sendBtn, { opacity: input.trim() && !loading ? 1 : 0.4 }]}
                disabled={!input.trim() || loading}
              >
                <IconSymbol name="paperplane.fill" size={18} color="#0D1117" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const cs = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 80, right: 16,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#00E5FF', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(0, 229, 255, 0.4)' },
      default: { elevation: 8 },
    }),
    zIndex: 1000,
  },
  fabIcon: { fontSize: 28 },
  fabBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#FF4444', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  fabBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', fontFamily: 'monospace' },
  modalContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  chatCard: {
    width: '100%', backgroundColor: '#0D1117', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderBottomWidth: 0, borderColor: '#1A3A2A', overflow: 'hidden', flex: 1,
  },
  chatHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A3A2A',
    backgroundColor: '#0A0E14',
  },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatHeaderIcon: { fontSize: 24 },
  chatHeaderTitle: { fontSize: 13, fontWeight: '800', color: '#00E5FF', fontFamily: 'monospace', letterSpacing: 1 },
  chatHeaderSubtitle: { fontSize: 10, color: '#6B8A7A', fontFamily: 'monospace', marginTop: 1 },
  closeBtn: { padding: 8, borderRadius: 8, backgroundColor: '#1A2A3A' },
  messagesList: { padding: 16, flexGrow: 1 },
  msgRow: { marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },
  avatarAI: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A3A2A', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14 },
  msgBubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  msgBubbleUser: { backgroundColor: '#00E5FF', borderBottomRightRadius: 4 },
  msgBubbleAssistant: { backgroundColor: '#1A2A3A', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextUser: { color: '#0D1117', fontWeight: '500' },
  msgTextAssistant: { color: '#E0F0EA' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A2A3A', borderRadius: 16, padding: 12 },
  loadingText: { fontSize: 12, color: '#6B8A7A', fontFamily: 'monospace' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#00E5FF', fontFamily: 'monospace', letterSpacing: 1 },
  emptySubtitle: { fontSize: 13, color: '#6B8A7A', textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 320 },
  suggestionsGrid: { marginTop: 20, gap: 8, width: '100%', maxWidth: 360 },
  suggestionBtn: { backgroundColor: '#111820', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1A3A2A' },
  suggestionText: { fontSize: 13, color: '#9BA8B0', textAlign: 'center' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#1A3A2A', backgroundColor: '#0A0E14',
  },
  textInput: {
    flex: 1, backgroundColor: '#111820', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: '#E0F0EA', borderWidth: 1, borderColor: '#1A3A2A',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#00E5FF',
    justifyContent: 'center', alignItems: 'center',
  },
});
