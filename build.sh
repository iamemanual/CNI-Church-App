#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Church Companion — Android Build Pipeline
# ==============================================================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
NOTIFICATIONS_DIR="/storage/emulated/0/Notifications"
WORKSPACE_DIR="/storage/emulated/0/Workspace"
GRADLE_BIN="/data/data/com.termux/files/home/.gradle/wrapper/dists/gradle-8.7-bin/bhs2wmbdwecv87pi65oeuq5iu/gradle-8.7/bin/gradle"
APKSIGNER="/data/data/com.termux/files/home/android-sdk/build-tools/34.0.0/apksigner"

BUILD_TYPE="${1:-release}"
TARGET_TASK=":app:assembleRelease"
SOURCE_APK="${PROJECT_DIR}/app/build/outputs/apk/release/app-release.apk"
OUTPUT_APK="${NOTIFICATIONS_DIR}/ChurchCompanion.apk"

if [ "$BUILD_TYPE" = "debug" ]; then
    TARGET_TASK=":app:assembleDebug"
    SOURCE_APK="${PROJECT_DIR}/app/build/outputs/apk/debug/app-debug.apk"
fi

echo "=================================================================="
echo "✨ Building Church Companion (${BUILD_TYPE})..."
echo "=================================================================="

cd "${PROJECT_DIR}"

if [ -f "${GRADLE_BIN}" ]; then
    "${GRADLE_BIN}" "${TARGET_TASK}" --offline
elif [ -f "${PROJECT_DIR}/gradlew" ]; then
    bash "${PROJECT_DIR}/gradlew" "${TARGET_TASK}" --offline
else
    gradle "${TARGET_TASK}" --offline
fi

if [ ! -f "${SOURCE_APK}" ]; then
    echo "❌ Error: Output APK not found at ${SOURCE_APK}"
    exit 1
fi

# Remove APKs from Workspace so the APK exists ONLY in the Notifications folder
rm -f "${WORKSPACE_DIR}/ChurchCompanion.apk"
rm -f "${WORKSPACE_DIR}/ChurchCompanion-debug.apk"
rm -f "${NOTIFICATIONS_DIR}/ChurchCompanion-debug.apk"

# Save the single APK in the Notifications folder
cp -f "${SOURCE_APK}" "${OUTPUT_APK}"

echo "=================================================================="
echo "🔏 Verifying APK signature with apksigner..."
if [ -f "${APKSIGNER}" ]; then
    "${APKSIGNER}" verify -v "${OUTPUT_APK}"
fi

echo "=================================================================="
echo "🎉 SUCCESS: Church Companion APK is built!"
echo "   📱 Output APK: ${OUTPUT_APK}"
echo "   📦 Size: $(ls -lh "${OUTPUT_APK}" | awk '{print $5}')"
echo "=================================================================="
