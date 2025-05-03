import * as FileSystem from "expo-file-system";
import { Pipeline } from "react-native-transformers";

// Add this outside the function to keep a reference
let activeDownloadTask: FileSystem.DownloadResumable | null = null;
let isCancelled = false;
let abortController: AbortController | null = null;

// New utility function to check if a model format is already downloaded
export const isModelDownloaded = async (
  modelName: string,
  modelFormat: string
): Promise<boolean> => {
  try {
    // For models, we need to check all required files
    const localDir = FileSystem.cacheDirectory + `${modelName}/`;

    // Check if directory exists
    const dirInfo = await FileSystem.getInfoAsync(localDir);
    if (!dirInfo.exists) {
      return false;
    }

    // Check if model file exists
    const modelPath = localDir + modelFormat;
    const modelInfo = await FileSystem.getInfoAsync(modelPath);

    // Check if config and tokenizer files exist
    const configPath = localDir + "config.json";
    const configInfo = await FileSystem.getInfoAsync(configPath);

    const tokenizerConfigPath = localDir + "tokenizer_config.json";
    const tokenizerConfigInfo = await FileSystem.getInfoAsync(
      tokenizerConfigPath
    );

    const tokenizerPath = localDir + "tokenizer.json";
    const tokenizerInfo = await FileSystem.getInfoAsync(tokenizerPath);

    // The model is considered downloaded if all required files exist
    return (
      modelInfo.exists &&
      configInfo.exists &&
      tokenizerConfigInfo.exists &&
      tokenizerInfo.exists
    );
  } catch (error) {
    console.error("Error checking if model is downloaded:", error);
    return false;
  }
};

export const cancelDownload = async () => {
  try {
    console.log("Attempting to cancel download...");
    // Set the global cancellation flag
    isCancelled = true;

    // Cancel any in-progress fetch operations
    if (abortController) {
      abortController.abort();
      console.log("Aborted fetch operations");
    }

    // Pause any active download
    if (activeDownloadTask) {
      try {
        await activeDownloadTask.pauseAsync();
        console.log("Paused active download");
      } catch (err) {
        console.error("Error pausing download:", err);
      }
      activeDownloadTask = null;
    }

    // Wait a moment to ensure cancellation propagates
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("Download cancelled successfully");
  } catch (error) {
    console.error("Failed to cancel download:", error);
  } finally {
    // Always reset state
    activeDownloadTask = null;
  }
};

// Forcefully reset download state
export const resetDownloadState = () => {
  isCancelled = true;
  if (abortController) {
    abortController.abort();
  }
  activeDownloadTask = null;
  abortController = null;
};

export const loadModel = async (
  preset: {
    name: string;
    model: string;
    onnx_path: string;
    options?: any;
  },
  setProgress: (progress: number) => void,
  onComplete: () => void,
  setStatus: (status: string) => void
) => {
  console.log("Loading...");
  setStatus("Initializing...");

  // Reset the cancellation flag and create a new abort controller
  isCancelled = false;
  abortController = new AbortController();
  activeDownloadTask = null;

  let name = preset.name;
  // Extract the requested model format from the onnx_path
  const selectedModelFormat = preset.onnx_path.split("/").pop();

  // Function to get the required files based on selected model format
  const getRequiredFiles = async (
    modelId: string,
    modelFormat: string | undefined
  ): Promise<string[]> => {
    try {
      if (isCancelled || !modelFormat) return [];

      setStatus("Checking model files...");
      const response = await fetch(
        `https://huggingface.co/api/models/${modelId}`,
        { signal: abortController?.signal }
      );

      if (!response.ok) {
        console.error(`Failed to fetch model metadata for ${modelId}`);
        return [];
      }

      const data = await response.json();
      if (!data.siblings || !Array.isArray(data.siblings)) {
        console.error("Invalid response format from HuggingFace API");
        return [];
      }

      // Filter to include config.json, tokenizer files, and the specific model format file
      const requiredFiles = data.siblings
        .filter((file: { rfilename: string }) => {
          const fileName = file.rfilename;
          return (
            fileName === "config.json" ||
            fileName === "tokenizer_config.json" ||
            fileName === "tokenizer.json" ||
            fileName === modelFormat
          );
        })
        .map((file: { rfilename: string }) => file.rfilename);

      console.log(`Required files for ${modelFormat}:`, requiredFiles);
      return requiredFiles;
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Fetch aborted");
        throw new Error("Download cancelled by user");
      }
      console.error("Error fetching file list:", error);
      return [];
    }
  };

  try {
    // Fetch only required files based on the selected model format
    const requiredFiles = await getRequiredFiles(
      preset.model,
      selectedModelFormat
    );
    console.log(
      `Required files to download for ${preset.model} with format ${selectedModelFormat}: ${requiredFiles.length}`
    );

    if (requiredFiles.length === 0 || isCancelled) {
      if (isCancelled) {
        setStatus("Download cancelled");
        return;
      }
      console.warn(
        `No required files found for ${preset.model} with format ${selectedModelFormat}`
      );
      setProgress(1); // Set progress to 100% if no files
      setStatus("Required files not found");
    }

    console.log("Required files:", requiredFiles);

    let downloadedFiles = 0;
    const fileCount = requiredFiles.length;

    const fetchWithCache = async (url: string) => {
      const localDir = FileSystem.cacheDirectory + `${name}/`;
      const localPath = localDir + url.split("/").pop()!;

      const dirInfo = await FileSystem.getInfoAsync(localDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });
      }

      let fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        console.log("File exists locally: " + localPath);
        // Add validation for JSON files
        if (localPath.endsWith(".json")) {
          try {
            const content = await FileSystem.readAsStringAsync(localPath);
            JSON.parse(content); // Validate JSON
            console.log(`Valid JSON in ${localPath}`);
          } catch (error) {
            console.error(`Invalid JSON in ${localPath}:`, error);
            // Delete the invalid file so it can be redownloaded
            await FileSystem.deleteAsync(localPath);
            fileInfo = await FileSystem.getInfoAsync(localPath); // Refresh file info
          }
        }
        if (fileInfo.exists) {
          downloadedFiles++;
          setStatus(`File ${downloadedFiles}/${fileCount} already downloaded`);
          return localPath;
        }
      }

      // Check again if cancelled before starting a new download
      if (isCancelled) {
        console.log("Download cancelled before starting a new file");
        await new Promise((resolve) => setTimeout(resolve, 200));
        throw new Error("Download cancelled by user");
      }

      setStatus(
        `Downloading file ${downloadedFiles + 1}/${
          downloadedFiles + 1 > fileCount ? downloadedFiles + 1 : fileCount
        }...`
      );
      console.log("Downloading... " + url);

      try {
        activeDownloadTask = FileSystem.createDownloadResumable(
          url,
          localPath,
          {},
          (progress) => {
            if (isCancelled) return;
            // Only show progress for the current file (0-100%)
            const currentFileProgress =
              progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
            setProgress(currentFileProgress);
            console.log(
              "Current file progress:",
              Math.round(currentFileProgress * 100) + "%"
            );
          }
        );

        const result = await activeDownloadTask.downloadAsync();
        activeDownloadTask = null;

        if (isCancelled) {
          console.log("Download cancelled after file completed");
          throw new Error("Download cancelled by user");
        }

        if (!result) {
          throw new Error("Download failed.");
        }

        console.log("Downloaded as " + result.uri);

        downloadedFiles++;
        // Reset progress for next file
        setProgress(0);
        setStatus(
          `File ${downloadedFiles}/${fileCount} downloaded successfully`
        );

        return result.uri;
      } catch (error: any) {
        if (isCancelled || error.message?.includes("cancelled")) {
          console.log("Download of file cancelled");
          throw new Error("Download cancelled by user");
        }
        throw error;
      }
    };

    // Create the model directory path for initialization
    const modelDirPath = FileSystem.cacheDirectory + `${name}/`;

    // Download all required files before model initialization
    setStatus("Downloading model files...");
    for (const file of requiredFiles) {
      // Construct the full URL for each file
      const fileUrl = `https://huggingface.co/${preset.model}/resolve/main/${file}`;

      if (isCancelled) {
        setStatus("Download cancelled");
        return;
      }

      try {
        await fetchWithCache(fileUrl);
      } catch (error: any) {
        if (isCancelled || error.message?.includes("cancelled")) {
          setStatus("Download cancelled");
          return;
        }
        throw error;
      }
    }

    // Initialize the model after all files are downloaded
    setStatus("Loading model...");
    // Check if download was cancelled before model initialization
    if (isCancelled) {
      setStatus("Download cancelled");
      return;
    }

    console.log("Using model path:", modelDirPath);

    await Pipeline.TextGeneration.init(
      preset.model,
      modelDirPath,
      preset.onnx_path,
      {
        verbose: true,
        fetch: fetchWithCache,
        ...preset.options,
      }
    );

    if (!isCancelled) {
      setProgress(1); // Ensure progress reaches 100% after completion
      setStatus("Model loaded successfully");
      onComplete();
      console.log("Loaded.");
    }
  } catch (error: any) {
    if (isCancelled || error.message?.includes("cancelled")) {
      console.log("Model loading cancelled");
      setStatus("Download cancelled");
    } else {
      console.error("Error loading model:", error);
      setStatus("Error: " + (error.message || "Unknown error"));
    }
  } finally {
    // Clean up resources
    if (isCancelled) {
      setStatus("Download cancelled");
    }
    abortController = null;
  }
};

export const deleteModelFiles = async (
  modelName: string,
  llmName: string,
  callback?: () => void
) => {
  try {
    const modelPath = FileSystem.cacheDirectory + `${llmName}/${modelName}`;
    console.log("Deleting model files from:", modelPath);
    await FileSystem.deleteAsync(modelPath, { idempotent: true });
    console.log("Model files deleted successfully");
    callback?.();
  } catch (error) {
    console.error("Error deleting model files:", error);
  }
};
