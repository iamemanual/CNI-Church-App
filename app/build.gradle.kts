import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val versionPropsFile = file("version.properties")
val versionProps = Properties()

if (versionPropsFile.exists()) {
    FileInputStream(versionPropsFile).use { versionProps.load(it) }
} else {
    versionProps["versionCode"] = "4092041"
    versionProps["versionMajor"] = "2"
    versionProps["versionMinor"] = "1"
    versionProps["versionPatch"] = "7"
    FileOutputStream(versionPropsFile).use { versionProps.store(it, "Church Companion Version Properties") }
}

var currentCode = (versionProps["versionCode"] as? String)?.toIntOrNull() ?: 4092041
var major = (versionProps["versionMajor"] as? String)?.toIntOrNull() ?: 2
var minor = (versionProps["versionMinor"] as? String)?.toIntOrNull() ?: 1
var patch = (versionProps["versionPatch"] as? String)?.toIntOrNull() ?: 7

val isBuildingApk = gradle.startParameter.taskNames.any {
    it.contains("assemble", ignoreCase = true) ||
    it.contains("package", ignoreCase = true) ||
    it.contains("build", ignoreCase = true)
}

if (isBuildingApk && !rootProject.extensions.extraProperties.has("versionAlreadyIncremented")) {
    currentCode += 1
    patch += 1
    versionProps["versionCode"] = currentCode.toString()
    versionProps["versionPatch"] = patch.toString()
    FileOutputStream(versionPropsFile).use { versionProps.store(it, "Church Companion Auto-Incremented Build Version") }
    rootProject.extensions.extraProperties.set("versionAlreadyIncremented", true)
    println(">>> [Auto-Version] Incremented build to versionCode=$currentCode, versionName=v$major.$minor.$patch")
}

val computedVersionCode = currentCode
val computedVersionName = "v$major.$minor.$patch"

android {
    namespace = "com.allsaints.church"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.allsaints.church"
        minSdk = 26
        targetSdk = 34
        versionCode = computedVersionCode
        versionName = computedVersionName

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        create("release") {
            val defaultKeystore = file("${System.getProperty("user.home")}/.android/debug.keystore")
            if (defaultKeystore.exists()) {
                storeFile = defaultKeystore
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            val releaseSigning = signingConfigs.getByName("release")
            if (releaseSigning.storeFile != null) {
                signingConfig = releaseSigning
            }
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("androidx.viewpager2:viewpager2:1.1.0")
    implementation("androidx.fragment:fragment-ktx:1.7.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.1")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
}
