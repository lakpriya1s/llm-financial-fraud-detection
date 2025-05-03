import React, {
  useState,
  useEffect,
  useRef,
  SetStateAction,
  useCallback,
} from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Clipboard,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import DropDownPicker from "react-native-dropdown-picker";
import * as Progress from "react-native-progress";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  loadModel,
  cancelDownload,
  resetDownloadState,
  isModelDownloaded,
  deleteModelFiles,
} from "../utils/modelHandlers";
import { Ionicons } from "@expo/vector-icons";

import user from "../../assets/confused-user.png";
import shield from "../../assets/shield.png";
import Button from "../components/Button";
import AutoComplete from "../views/AutoComplete";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PRESETS_URL =
  "https://raw.githubusercontent.com/lakpriya1s/llm-financial-fraud-detection/refs/heads/main/presets.json";
const PRESETS_CACHE_KEY = "@fraudshield_presets";

const MODEL_FORMATS = [
  { label: "Full precision baseline", value: "model.onnx" },
  { label: "4-bit quant using BitsAndBytes", value: "model_bnb4.onnx" },
  { label: "Half precision", value: "model_fp16.onnx" },
  { label: "INT8 quantized", value: "model_int8.onnx" },
  { label: "4-bit quantized", value: "model_q4.onnx" },
  { label: "Mixed 4-bit with fp16", value: "model_q4f16.onnx" },
  { label: "Generic quantized", value: "model_quantized.onnx" },
  { label: "Unsigned INT8 quantized", value: "model_uint8.onnx" },
];

const HomeScreen = () => {
  const [downloadable, setDownloadable] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [input, setInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [open, setOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const [formatValue, setFormatValue] = useState<string | null>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [formatItems, setFormatItems] = useState(MODEL_FORMATS);
  const [downloadedFormats, setDownloadedFormats] = useState<string[]>([]);
  const [isCheckingFormats, setIsCheckingFormats] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const [firstDropdownZIndex, setFirstDropdownZIndex] = useState(2000);
  const [secondDropdownZIndex, setSecondDropdownZIndex] = useState(1000);
  const [downloadedVarients, setDownloadedVarients] = useState<string[]>([]);
  const isAndroid = Platform.OS === "android";

  const checkDownloadedFormats = async (
    modelName: string,
    silent: boolean = false
  ) => {
    if (!modelName) return;

    if (!silent) setIsCheckingFormats(true);

    const downloaded: string[] = [];

    try {
      const checkPromises = MODEL_FORMATS.map(async (format) => {
        const isDownloaded = await isModelDownloaded(modelName, format.value);
        if (isDownloaded) {
          // downloaded.push(format.value);
          downloadedVarients.push(format.value);
          setDownloadedVarients(downloadedVarients);
        }
      });

      await Promise.all(checkPromises);
      setDownloadedFormats(downloaded);

      setFormatItems(
        MODEL_FORMATS.map((format) => {
          const isDownloaded = downloaded.includes(format.value);
          return {
            ...format,
            label: isDownloaded ? `${format.label} ` : format.label,
            containerStyle: isDownloaded ? { backgroundColor: "#e6f7ff" } : {},
            labelStyle: isDownloaded
              ? { fontWeight: "bold", color: "#0078d4" }
              : {},
          };
        })
      );
    } catch (error) {
      console.error("Error checking variants:", error);
    } finally {
      setIsCheckingFormats(false);
    }
  };

  const loadSelectedModel = async () => {
    if (
      !value ||
      !formatValue ||
      formatValue === null ||
      formatValue === undefined
    ) {
      setDownloadable(false);
      return;
    }

    const onComplete = () => {
      setProgress(1);
      if (value) {
        checkDownloadedFormats(value, true);
      }
      setTimeout(() => {
        setDownloadable(false);
      }, 500);
    };

    const preset = presets.find((preset) => preset.name === value);
    if (!preset) return;

    setProgress(0);
    setDownloadable(true);
    const modelPath = `${preset.onnx_path}/${formatValue}`;
    loadModel(
      { ...preset, onnx_path: modelPath },
      setProgress,
      onComplete,
      setStatus
    );
  };

  const deleteModel = useCallback(
    (model: string) => {
      const handleDelete = () => {
        if (!model || !value) return;
        deleteModelFiles(model, value, () => {
          if (value) {
            checkDownloadedFormats(value);
            setFormatValue(null);
            setFormatOpen(false);
            setDownloadedFormats([]);
            setDownloadedVarients([]);
          }
        });
      };

      Alert.alert(
        "Delete Model",
        "Are you sure you want to delete this model?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: handleDelete },
        ]
      );
    },
    [downloadedFormats, value]
  );

  useEffect(() => {
    setIsCheckingFormats(false);
  }, []);

  useEffect(() => {
    loadSelectedModel();
  }, [value, formatValue]);

  useEffect(() => {
    if (value && (progress === 0 || progress === 1) && !downloadable) {
      const preset = presets.find((preset) => preset.name === value);
      if (preset) {
        checkDownloadedFormats(preset.name);
      }
    }
  }, [value, progress]);

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const response = await fetch(PRESETS_URL);
        const data = await response.json();

        setPresets(data);
        setItems(
          data.map((preset: any) => ({
            label: preset.name,
            value: preset.name,
          }))
        );

        await AsyncStorage.setItem(PRESETS_CACHE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error("Error fetching presets:", error);
        try {
          const cachedPresets = await AsyncStorage.getItem(PRESETS_CACHE_KEY);
          if (cachedPresets) {
            const parsedPresets = JSON.parse(cachedPresets);
            setPresets(parsedPresets);
            setItems(
              parsedPresets.map((preset: any) => ({
                label: preset.name,
                value: preset.name,
              }))
            );
          }
        } catch (cacheError) {
          console.error("Error using cached presets:", cacheError);
        }
      }
    };

    fetchPresets();
  }, []);

  const handleInputChange = (text: string) => {
    setInput(text);
  };

  const handleButtonPress = () => {
    Keyboard.dismiss();
    setShowModal(true);
  };

  const handlePaste = async () => {
    const text = await Clipboard.getString();
    setInput(text);
  };

  const handleClear = () => {
    setInput("");
  };

  const handleFirstDropdownOpen = (isOpen: SetStateAction<boolean>) => {
    setOpen(isOpen);
    if (typeof isOpen === "boolean") {
      if (isOpen) {
        setFirstDropdownZIndex(9999);
        setSecondDropdownZIndex(1000);
      } else {
        setFirstDropdownZIndex(2000);
        setSecondDropdownZIndex(1000);
      }
    }
  };

  const handleSecondDropdownOpen = (isOpen: SetStateAction<boolean>) => {
    setFormatOpen(isOpen);
    if (typeof isOpen === "boolean") {
      if (isOpen) {
        setSecondDropdownZIndex(9999);
        setFirstDropdownZIndex(1000);
      } else {
        setFirstDropdownZIndex(2000);
        setSecondDropdownZIndex(1000);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
        contentContainerStyle={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          keyboardShouldPersistTaps={"handled"}
          nestedScrollEnabled={true}
          scrollEnabled={!open && !formatOpen}
          contentContainerStyle={styles.contentContainer}
          style={styles.scrollView}
        >
          <View style={styles.topContent}>
            <View style={styles.logoWrapper}>
              <Image source={shield} style={styles.logo} />
              <Text style={styles.logoText}>FraudSheild</Text>
            </View>
            <View style={styles.subTitle}>
              <Text>Protecting users from financial fraud.</Text>
            </View>
            <View style={styles.imageWrapper}>
              <Image source={user} style={styles.image} />
            </View>
            <Text style={styles.description}>
              {`Received a suspicious message?\n\n Stay calm and verify it instantly with our financial fraud detection LLMs on your device!`}
            </Text>
          </View>

          <Text style={styles.inputTitle}>Fraud Detection LLM</Text>
          <View
            style={[styles.dropDownWrapper, { zIndex: firstDropdownZIndex }]}
          >
            <DropDownPicker
              open={open}
              value={value}
              items={items}
              setOpen={handleFirstDropdownOpen}
              setValue={setValue}
              setItems={setItems}
              style={styles.dropDown}
              placeholder="Select a Model"
              disabled={downloadable}
              listMode={"SCROLLVIEW"}
              zIndex={firstDropdownZIndex}
              containerStyle={{ zIndex: firstDropdownZIndex }}
            />
          </View>

          <Text style={[styles.inputTitle, { marginTop: 16 }]}>
            Model Variants
          </Text>
          <View
            style={[styles.dropDownWrapper, { zIndex: secondDropdownZIndex }]}
          >
            {!value ? (
              <View style={styles.selectModelFirstContainer}>
                <Text style={styles.selectModelFirstText}>
                  Select a model first
                </Text>
              </View>
            ) : isCheckingFormats ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color="#0078d4" />
                <Text style={styles.loaderText}>
                  Checking available variants...
                </Text>
              </View>
            ) : (
              <DropDownPicker
                open={formatOpen}
                value={formatValue}
                items={formatItems}
                setOpen={handleSecondDropdownOpen}
                setValue={setFormatValue}
                setItems={setFormatItems}
                style={styles.dropDown}
                placeholder="Select Model Variant"
                placeholderStyle={styles.placeholderStyle}
                showArrowIcon={true}
                ArrowUpIconComponent={() => (
                  <Ionicons name="chevron-up" size={16} color="#666" />
                )}
                ArrowDownIconComponent={() => (
                  <Ionicons name="chevron-down" size={16} color="#666" />
                )}
                disabled={downloadable}
                listMode={!isAndroid ? "SCROLLVIEW" : "MODAL"}
                modalTitle="Select Model Varient"
                modalTitleStyle={{
                  marginTop: 16,
                }}
                zIndex={secondDropdownZIndex}
                containerStyle={{ zIndex: secondDropdownZIndex }}
                renderListItem={(props) => {
                  const isDownloaded = downloadedVarients.includes(
                    props?.item?.value || ""
                  );
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        if (props.item.value) {
                          setFormatValue(props.item.value);
                          setFormatOpen(false);
                        }
                      }}
                      style={isDownloaded ? styles.downloadedItem : {}}
                    >
                      <View style={styles.varientItem}>
                        <Text
                          style={isDownloaded ? styles.downloadedItemText : {}}
                        >
                          {props.item.label}
                        </Text>
                        {props.item.value && isDownloaded && (
                          <TouchableOpacity
                            onPress={() => {
                              deleteModel(props.item?.value || "");
                            }}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color="#FF3B30"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
          <View style={styles.formatStatusContainer}>
            {value && downloadedFormats.length > 0 && !isCheckingFormats && (
              <View style={styles.formatStatusBadge}>
                <Text style={styles.formatStatusText}>
                  {downloadedFormats.length} format
                  {downloadedFormats.length !== 1 ? "s" : ""} available offline
                </Text>
              </View>
            )}
          </View>
          {downloadable && (
            <View style={styles.progressBarContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Progress.Bar
                  progress={progress}
                  width={SCREEN_WIDTH - 80}
                  height={8}
                />
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      console.log("User pressed cancel button");
                      await cancelDownload();
                    } catch (error) {
                      console.error("Error cancelling download:", error);
                      resetDownloadState();
                    } finally {
                      setDownloadable(false);
                      setProgress(0);
                      setStatus("Download cancelled");
                      setFormatValue(null);

                      // Refresh the format items list after cancelling
                      if (value) {
                        const preset = presets.find(
                          (preset) => preset.name === value
                        );
                        if (preset) {
                          checkDownloadedFormats(preset.name);
                        }
                      }
                    }
                  }}
                  style={{ marginLeft: 8 }}
                >
                  <Ionicons name="stop-circle" size={28} color="#FF3B30" />
                </TouchableOpacity>
              </View>
              <Text style={styles.progressBarText}>
                {(progress * 100).toFixed(2)}%
              </Text>
              <Text style={styles.progressBarText}>{status}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <View style={styles.inputTitleContainer}>
              <Text style={styles.inputTitle}>Suspicious Message</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.pasteButton}
                  onPress={handlePaste}
                >
                  <Text style={styles.pasteButtonText}>Paste</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClear}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.messageInputWrapper}>
              <TextInput
                style={styles.messageInput}
                placeholder="Enter Message"
                multiline={true}
                onChangeText={handleInputChange}
                value={input}
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
              />
            </View>
          </View>
          <Text style={styles.aiDisclaimer}>
            AI can make mistakes. Check important info
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              title="Scan Message"
              onPress={handleButtonPress}
              disabled={downloadable || !input || !formatValue}
            />
          </View>
        </ScrollView>
        {showModal && (
          <View style={styles.modalBackground}>
            <View style={styles.modalCard}>
              <AutoComplete
                closeModal={() => setShowModal(false)}
                input={input}
              />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  input: {
    borderWidth: 1,
    borderColor: "black",
  },
  logoWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#004AAD",
  },
  subTitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  imageWrapper: {
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },
  image: {
    width: 200,
    height: 200,
  },
  description: {
    marginTop: 16,
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
    textAlign: "center",
  },
  topContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  bottomContent: {
    width: "100%",
    padding: 16,
    zIndex: 2,
  },
  dropDownWrapper: {
    width: "100%",
    marginBottom: 16,
    position: "relative",
  },
  dropDown: {
    width: "100%",
    backgroundColor: "#D1f1ff",
    borderWidth: 1,
    borderColor: "#8FAFDB",
    borderRadius: 0,
  },
  dropDownContainer: {
    width: "100%",
    backgroundColor: "#D1f1ff",
    borderWidth: 1,
    borderColor: "#8FAFDB",
    borderRadius: 0,
    maxHeight: 300,
    zIndex: 1000,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  inputTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  inputContainer: {
    marginTop: 32,
    width: "100%",
  },
  inputTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageInputWrapper: {
    width: "100%",
    position: "relative",
  },
  messageInput: {
    width: "100%",
    minHeight: 180,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    paddingTop: 10,
    backgroundColor: "#D1f1ff",
    textAlignVertical: "top",
  },
  pasteButton: {
    backgroundColor: "#004AAD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  pasteButtonText: {
    color: "white",
    fontWeight: "500",
  },
  clearButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    color: "white",
    fontWeight: "500",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 16,
  },
  progressBarContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  progressBarText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
  },
  modalBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    width: "100%",
    height: "100%",
    flex: 1,
    padding: 16,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    maxHeight: "90%",
  },
  modalContentContainer: {
    backgroundColor: "#D1f1ff",
    padding: 20,
    borderRadius: 8,
    maxHeight: "80%",
    margin: 20,
  },
  dropdownItemLabel: {
    fontSize: 14,
    paddingVertical: 8,
  },
  dropdownItemContainer: {
    maxHeight: 300,
  },
  placeholderStyle: {
    color: "#666",
    fontStyle: "italic",
  },
  formatStatusContainer: {
    marginTop: 4,
    alignItems: "flex-end",
    marginBottom: 16,
  },
  formatStatusBadge: {
    backgroundColor: "#0078d4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  formatStatusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  loaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D1f1ff",
    borderWidth: 1,
    borderColor: "#8FAFDB",
    borderRadius: 0,
    padding: 12,
    width: "100%",
    height: 50,
  },
  loaderText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#0078d4",
  },
  selectModelFirstContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    backgroundColor: "#f7f7f7",
    width: "100%",
  },
  selectModelFirstText: {
    fontSize: 14,
    color: "#666",
  },
  contentContainer: {
    paddingHorizontal: 10,
  },
  scrollView: {
    marginBottom: 10,
  },
  aiDisclaimer: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
  },
  varientItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  downloadedItem: {
    backgroundColor: "#e6f7ff",
  },
  downloadedItemText: {
    fontWeight: "bold",
    color: "#0078d4",
  },
});
