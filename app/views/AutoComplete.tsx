import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import * as Progress from "react-native-progress";
import { Pipeline } from "react-native-transformers";
import axios from "axios";

import warning from "../../assets/warning.png";
import check from "../../assets/checkmark.png";
import robot from "../../assets/robot.png";
import like from "../../assets/like.png";
import dislike from "../../assets/dislike.png";

import Button from "../components/Button";

const SCREEN_WIDTH = Dimensions.get("window").width;
const APP_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby7FfuenyeCMsxByVeMeaJMH22CW6LLUvyz_ymAf3ePgGAqicfL2CbE7suNdj4g_tjzAg/exec";

const AutoComplete = ({
  closeModal,
  input,
}: {
  closeModal: () => void;
  input: string;
}) => {
  const chatPrompt = `<|im_start|>system
    You are a helpful assistant that detects financial fraud. Respond with 'Yes' or 'No' only.<|im_end|>
    <|im_start|>user
    Is the following text fraudulent?
    
    Text: ${input}
    Fraud:<|im_end|>
    <|im_start|>assistant`;
  const [fetching, setFetching] = useState<boolean>(false);
  const [output, setOutput] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);
  const [showImprovement, setShowImprovement] = useState<boolean>(false);
  const detectionTime = useRef<number>(0);

  const startTime = Date.now();

  const handlePipelineComplete = (output: string) => {
    setLoading(false);
    setOutput(output);
    // Only measure time for first 3 letters since that's what determines fraud
    const firstThreeLetters = output.substring(0, 3).toLowerCase();
    const isFraud = firstThreeLetters.includes("yes");
    if (detectionTime.current) return;
    detectionTime.current = Date.now() - startTime;
  };

  const handleCloseModal = () => {
    closeModal();
  };

  const handleImprovement = async () => {
    try {
      setFetching(true);
      await axios.post(APP_SCRIPT_URL, {
        message: input,
        output: output,
        type: "APP_RESPONSE",
        isFraud: output?.toLowerCase().includes("yes"),
      });
      closeModal();
      setFetching(false);
      console.log("Improvement sent");
    } catch (error) {
      console.log("Error: ", error);
      setFetching(false);
    }
  };

  const handleLike = async (like: boolean) => {
    try {
      setFetching(true);
      await axios.post(APP_SCRIPT_URL, {
        helpful: like,
        type: "USER_FEEDBACK",
      });
      setFetching(false);
    } catch (error) {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!input) return;
    setLoading(true);
    Pipeline.TextGeneration.generate(chatPrompt, handlePipelineComplete);
  }, [input]);

  // console.log("OUTPUT ==> ", output);

  const isFraud = output?.toLowerCase().includes("yes");
  const isOutputComplete = !!output && output.length >= 3;
  const showLoader =
    loading || output === undefined || (!!output && output.length < 3);

  return (
    <View style={styles.container}>
      <View style={styles.closeButtonContainer}>
        <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
      {!showImprovement ? (
        <>
          {fetching && <ActivityIndicator size="large" color="#0000ff" />}
          {showLoader && (
            <View style={styles.progressBarContainer}>
              <Progress.Bar
                progress={0.4}
                width={SCREEN_WIDTH - 128}
                height={8}
                indeterminate={true}
              />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}
          {isOutputComplete && isFraud && (
            <View style={styles.outputContainer}>
              <Image source={warning} style={styles.warningImage} />
              <Text style={styles.warningText}>FRAUD DETECTED</Text>
              <Text style={styles.outputText}>
                This message appears to be fraudulent. Do not respond or share
                personal details!
              </Text>
              <Text style={styles.timeText}>
                Detection time: {detectionTime.current}ms
              </Text>
              <View style={styles.feedbackContainer}>
                <Text>How did we do?</Text>
                <TouchableOpacity
                  style={styles.feedbackButton}
                  onPress={() => handleLike(true)}
                >
                  <Image source={like} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.feedbackButton}
                  onPress={() => handleLike(false)}
                >
                  <Image source={dislike} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {isOutputComplete && !isFraud && (
            <View style={styles.outputContainer}>
              {fetching && <ActivityIndicator size="large" color="#0000ff" />}
              <Image source={check} style={styles.warningImage} />
              <Text style={styles.safeText}>SAFE MESSAGE</Text>
              <Text style={styles.outputText}>
                This message appears to be safe. You can proceed with
                confidence.
              </Text>
              <Text style={styles.timeText}>
                Detection time: {detectionTime.current}ms
              </Text>
              <View style={styles.feedbackContainer}>
                <Text>How did we do?</Text>
                <TouchableOpacity
                  style={styles.feedbackButton}
                  onPress={() => handleLike(true)}
                >
                  <Image source={like} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.feedbackButton}
                  onPress={() => handleLike(false)}
                >
                  <Image source={dislike} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={styles.buttonContainer}>
            <Button
              title="Okay"
              onPress={() => setShowImprovement(true)}
              buttonStyle={styles.neutralButton}
            />
          </View>
        </>
      ) : (
        <View style={styles.outputContainer}>
          {fetching && <ActivityIndicator size="small" color="#0000ff" />}
          <Image source={robot} style={styles.warningImage} />
          <Text style={styles.titleText}>Help Improve FraudSheild</Text>
          <Text style={styles.outputText}>
            Would you like to allow us to use this message to improve our fraud
            detection system? Your data will be anonymized and used only for
            training purposes.
          </Text>
          <View style={styles.buttonContainer}>
            <Button
              title="No, skip"
              onPress={closeModal}
              buttonStyle={styles.negativeButton}
            />
            <Button
              title="Yes, use it!"
              onPress={handleImprovement}
              buttonStyle={styles.positiveButton}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  progressBarContainer: {
    marginTop: 32,
    width: "100%",
    alignItems: "center",
  },
  closeButtonContainer: {
    width: "100%",
    alignItems: "flex-end",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: '#666',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "bold",
  },
  outputContainer: {
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  outputText: {
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 16,
    marginTop: 8,
    textAlign: "center",
  },
  warningImage: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  feedbackContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  feedbackButton: {
    padding: 4,
  },
  warningText: {
    fontSize: 20,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#CD2F2E",
  },
  safeText: {
    fontSize: 20,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#039855",
  },
  buttonContainer: {
    marginTop: 16,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#004AAD",
  },
  negativeButton: {
    backgroundColor: "#CD2F2E",
    width: 150,
  },
  positiveButton: {
    backgroundColor: "#039855",
    width: 150,
  },
  neutralButton: {
    width: "100%",
  },
  timeText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
});

export default AutoComplete;
