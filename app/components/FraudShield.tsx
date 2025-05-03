import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  ScrollView,
} from "react-native";

interface ModelPreset {
  name: string;
  model: string;
  onnx_path: string;
  options?: {
    externalData?: boolean;
    fileExtension?: string;
  };
}

interface ModelState {
  loading: boolean;
  progress: number;
  loaded: boolean;
  error?: string;
}

const PRESETS_URL =
  "https://raw.githubusercontent.com/lakpriya1s/llm-financial-fraud-detection/refs/heads/main/presets.json";

const FraudShield = () => {
  const [presets, setPresets] = useState<ModelPreset[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [message, setMessage] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isFraud, setIsFraud] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [modelState, setModelState] = useState<ModelState>({
    loading: false,
    progress: 0,
    loaded: false,
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const cardWidth = 215;

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const response = await fetch(PRESETS_URL);
        const data = await response.json();
        setPresets(data);
      } catch (error) {
        console.error("Error fetching presets:", error);
      }
    };

    fetchPresets();
  }, []);

  const handleModelSelect = async (modelName: string, index: number) => {
    setSelectedModel(modelName);
    setModelState({ loading: true, progress: 0, loaded: false });

    scrollViewRef.current?.scrollTo({
      x: index * cardWidth,
      animated: true,
    });

    try {
      for (let i = 0; i <= 100; i += 20) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setModelState((prev) => ({
          ...prev,
          progress: i,
        }));
      }

      setModelState({
        loading: false,
        progress: 100,
        loaded: true,
      });
    } catch (error) {
      setModelState({
        loading: false,
        progress: 0,
        loaded: false,
        error: "Failed to load model",
      });
    }
  };

  const handleCheck = () => {
    // Simulate fraud detection
    const fraudDetected = Math.random() > 0.5;
    setIsFraud(fraudDetected);
    setShowResult(true);
  };

  const ModelSelector = () => {
    const activeModels = presets.filter(
      (preset) => !preset.name.includes("Quantized")
    );

    return (
      <View style={styles.modelSelector}>
        <Text style={styles.label}>Fraud Detection LLM</Text>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {activeModels.map((model, index) => (
            <TouchableOpacity
              key={model.name}
              style={[
                styles.modelCard,
                selectedModel === model.name &&
                  !modelState.loaded &&
                  styles.modelCardSelected,
                selectedModel === model.name &&
                  modelState.loaded &&
                  styles.modelCardLoaded,
              ]}
              onPress={() => handleModelSelect(model.name, index)}
              disabled={modelState.loading}
            >
              <Text
                style={[
                  styles.modelName,
                  selectedModel === model.name && styles.modelNameSelected,
                ]}
                numberOfLines={2}
              >
                {model.name}
              </Text>
              {selectedModel === model.name && modelState.loading && (
                <View style={styles.progressContainer}>
                  <Text
                    style={[
                      styles.progressText,
                      selectedModel === model.name && styles.modelNameSelected,
                    ]}
                  >
                    {modelState.progress}%
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${modelState.progress}%` },
                      ]}
                    />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const ResultModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showResult}
      onRequestClose={() => setShowResult(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {isFraud ? (
            <>
              <Image
                source={require("../../assets/warning.png")}
                style={styles.modalIcon}
              />
              <Text style={styles.fraudText}>FRAUD DETECTED!</Text>
              <Text style={styles.modalMessage}>
                This message appears to be fraudulent. Do not respond or share
                personal details!
              </Text>
            </>
          ) : (
            <>
              <Image
                source={require("../../assets/checkmark.png")}
                style={styles.modalIcon}
              />
              <Text style={styles.safeText}>SAFE MESSAGE!</Text>
              <Text style={styles.modalMessage}>
                No fraud detected. Stay cautious and verify sender details if
                unsure.
              </Text>
            </>
          )}
          <View style={styles.feedbackContainer}>
            <Text>How did we do?</Text>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity>
                <Text style={styles.feedbackButton}>👍</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.feedbackButton}>👎</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.okayButton}
            onPress={() => {
              setShowResult(false);
              setShowFeedback(true);
            }}
          >
            <Text style={styles.okayButtonText}>Okay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const FeedbackModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showFeedback}
      onRequestClose={() => setShowFeedback(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Image
            source={require("../../assets/robot.png")}
            style={styles.modalIcon}
          />
          <Text style={styles.feedbackTitle}>Help Improve FraudShield!</Text>
          <Text style={styles.modalMessage}>
            Would you like to allow us to use this message to improve our fraud
            detection system? Your data will be anonymized and used only for
            training purposes.
          </Text>
          <View style={styles.feedbackActionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.skipButton]}
              onPress={() => setShowFeedback(false)}
            >
              <Text style={styles.actionButtonText}>No, Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.useButton]}
              onPress={() => setShowFeedback(false)}
            >
              <Text style={styles.actionButtonText}>Yes, Use It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("../../assets/shield.png")}
          style={styles.logo}
        />
        <Text style={styles.title}>FraudShield</Text>
        <Text style={styles.subtitle}>
          Protecting users from financial fraud.
        </Text>
      </View>

      <Image
        source={require("../../assets/confused-user.png")}
        style={styles.illustration}
      />
      <Text style={styles.instructionText}>
        Received a suspicious message? Stay calm and verify it instantly!
      </Text>

      <View style={styles.form}>
        <ModelSelector />

        <Text style={styles.label}>Suspicious Message</Text>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={4}
          placeholder="Enter Message Here..."
          value={message}
          onChangeText={setMessage}
        />

        <TouchableOpacity
          style={[
            styles.checkButton,
            (!modelState.loaded || !message) && styles.checkButtonDisabled,
          ]}
          onPress={handleCheck}
          disabled={!modelState.loaded || !message}
        >
          <Text style={styles.checkButtonText}>
            {modelState.loading ? "Loading Model..." : "Check for Fraud"}
          </Text>
        </TouchableOpacity>
      </View>

      <ResultModal />
      <FeedbackModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0052CC",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  illustration: {
    width: 150,
    height: 150,
    alignSelf: "center",
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
  },
  pickerButton: {
    backgroundColor: "#F0F7FF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  pickerButtonText: {
    color: "#333",
    fontSize: 16,
  },
  input: {
    backgroundColor: "#F0F7FF",
    borderRadius: 8,
    padding: 15,
    height: 120,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  checkButton: {
    backgroundColor: "#0052CC",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  checkButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  modalIcon: {
    width: 60,
    height: 60,
    marginBottom: 15,
  },
  fraudText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF3B30",
    marginBottom: 10,
  },
  safeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34C759",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  feedbackContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  feedbackButtons: {
    flexDirection: "row",
    marginTop: 10,
  },
  feedbackButton: {
    fontSize: 24,
    marginHorizontal: 10,
  },
  okayButton: {
    backgroundColor: "#0052CC",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  okayButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0052CC",
    marginBottom: 10,
  },
  feedbackActionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: "center",
  },
  skipButton: {
    backgroundColor: "#FF3B30",
  },
  useButton: {
    backgroundColor: "#34C759",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modelSelector: {
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  modelCard: {
    backgroundColor: "#F0F7FF",
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    width: 200,
    minHeight: 80,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    justifyContent: "center",
  },
  modelCardSelected: {
    backgroundColor: "#0052CC",
  },
  modelCardLoaded: {
    backgroundColor: "#34C759",
  },
  modelName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0052CC",
    textAlign: "center",
  },
  modelNameSelected: {
    color: "#fff",
  },
  progressContainer: {
    marginTop: 10,
  },
  progressText: {
    color: "#0052CC",
    fontSize: 12,
    marginBottom: 4,
    textAlign: "center",
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(0, 82, 204, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0052CC",
  },
  checkButtonDisabled: {
    opacity: 0.5,
  },
});

export default FraudShield;
