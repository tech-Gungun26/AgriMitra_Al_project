@@ .. @@
-import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
+import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
 import { Ionicons } from '@expo/vector-icons';
-import { useState } from 'react';
+import { useState, useRef } from 'react';
 import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
+import * as ImagePicker from 'expo-image-picker';
+import { PlantDiseaseDetectionService, PlantDiseaseResult } from '@/services/plantDiseaseAPI';
+import { useSpeech } from '@/hooks/useSpeech';

 export default function PlantAnalysisScreen() {
@@ .. @@
   const [permission, requestPermission] = useCameraPermissions();
   const [showCamera, setShowCamera] = useState(false);
-  const [analysisResult, setAnalysisResult] = useState<any>(null);
+  const [analysisResult, setAnalysisResult] = useState<PlantDiseaseResult | null>(null);
   const [isAnalyzing, setIsAnalyzing] = useState(false);
+  const [selectedImage, setSelectedImage] = useState<string | null>(null);
+  const cameraRef = useRef<CameraView>(null);
+  const { speak, stopSpeaking, isSpeaking } = useSpeech();
+  const plantDiseaseService = PlantDiseaseDetectionService.getInstance();

-  // Mock analysis function (replace with Vertex AI Vision)
-  const analyzeImage = async () => {
+  const analyzeImage = async (imageUri: string) => {
     setIsAnalyzing(true);
-    // Simulate API call delay
-    setTimeout(() => {
-      setAnalysisResult({
-        disease: 'टमाटर का झुलसा रोग',
-        confidence: 92,
-        symptoms: [
-          'पत्तियों पर भूरे धब्बे',
-          'पत्तियों का पीला होना',
-          'फल पर काले निशान'
-        ],
-        remedies: [
-          'कॉपर सल्फेट का छिड़काव करें',
-          'प्रभावित पत्तियों को हटा दें',
-          'नीम का तेल का उपयोग करें',
-          'पानी कम दें और हवादार जगह रखें'
-        ],
-        prevention: [
-          'बीज बोने से पहले कीटाणुशोधन करें',
-          'खेत में पानी जमा न होने दें',
-          'फसल चक्रण अपनाएं'
-        ]
-      });
+    
+    try {
+      // Convert image URI to File object
+      const response = await fetch(imageUri);
+      const blob = await response.blob();
+      const file = new File([blob], 'plant-image.jpg', { type: 'image/jpeg' });
+      
+      // Call AI service
+      const result = await plantDiseaseService.detectDisease(file);
+      setAnalysisResult(result);
+      setSelectedImage(imageUri);
+    } catch (error) {
+      console.error('Analysis failed:', error);
+      Alert.alert('त्रुटि', 'विश्लेषण में समस्या हुई। कृपया दोबारा कोशिश करें।');
+    } finally {
       setIsAnalyzing(false);
-      setShowCamera(false);
-    }, 2000);
+    }
   };

-  const takePicture = () => {
-    // Mock camera capture
-    analyzeImage();
+  const takePicture = async () => {
+    if (cameraRef.current) {
+      try {
+        const photo = await cameraRef.current.takePictureAsync({
+          quality: 0.8,
+          base64: false,
+        });
+        
+        if (photo?.uri) {
+          setShowCamera(false);
+          await analyzeImage(photo.uri);
+        }
+      } catch (error) {
+        console.error('Camera error:', error);
+        Alert.alert('त्रुटि', 'फोटो लेने में समस्या हुई।');
+      }
+    }
+  };
+
+  const pickImageFromGallery = async () => {
+    try {
+      const result = await ImagePicker.launchImageLibraryAsync({
+        mediaTypes: ImagePicker.MediaTypeOptions.Images,
+        allowsEditing: true,
+        aspect: [4, 3],
+        quality: 0.8,
+      });
+
+      if (!result.canceled && result.assets[0]) {
+        await analyzeImage(result.assets[0].uri);
+      }
+    } catch (error) {
+      console.error('Image picker error:', error);
+      Alert.alert('त्रुटि', 'गैलरी से फोटो चुनने में समस्या हुई।');
+    }
+  };
+
+  const speakResults = () => {
+    if (!analysisResult) return;
+    
+    if (isSpeaking) {
+      stopSpeaking();
+      return;
+    }
+
+    const textToSpeak = `
+      ${analysisResult.crop} में ${analysisResult.disease} की बीमारी पाई गई है। 
+      ${analysisResult.confidence} प्रतिशत सटीकता के साथ।
+      
+      लक्षण: ${analysisResult.symptoms.join(', ')}
+      
+      उपचार: ${analysisResult.treatment.join(', ')}
+      
+      बचाव: ${analysisResult.prevention.join(', ')}
+    `;
+    
+    speak(textToSpeak);
   };

@@ .. @@
     return (
       <View style={styles.container}>
-        <CameraView style={styles.camera} facing={facing}>
+        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
           <View style={styles.cameraControls}>
@@ .. @@
       {/* Camera Section */}
       <View style={styles.section}>
-        <TouchableOpacity 
-          style={styles.cameraCard}
-          onPress={() => setShowCamera(true)}
-        >
-          <View style={styles.cameraIcon}>
-            <Ionicons name="camera" size={48} color="#16A34A" />
-          </View>
-          <Text style={styles.cameraText}>पौधे की फोटो लें</Text>
-          <Text style={styles.cameraSubtext}>AI तुरंत बीमारी की पहचान करेगा</Text>
-        </TouchableOpacity>
+        <View style={styles.imageOptionsContainer}>
+          <TouchableOpacity 
+            style={styles.cameraCard}
+            onPress={() => setShowCamera(true)}
+          >
+            <View style={styles.cameraIcon}>
+              <Ionicons name="camera" size={32} color="#16A34A" />
+            </View>
+            <Text style={styles.cameraText}>कैमरा से फोटो लें</Text>
+          </TouchableOpacity>
+          
+          <TouchableOpacity 
+            style={styles.galleryCard}
+            onPress={pickImageFromGallery}
+          >
+            <View style={styles.galleryIcon}>
+              <Ionicons name="images" size={32} color="#16A34A" />
+            </View>
+            <Text style={styles.galleryText}>गैलरी से चुनें</Text>
+          </TouchableOpacity>
+        </View>
       </View>

+      {/* Selected Image Preview */}
+      {selectedImage && (
+        <View style={styles.section}>
+          <Text style={styles.sectionTitle}>अपलोड की गई फोटो:</Text>
+          <View style={styles.imagePreviewContainer}>
+            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
+          </View>
+        </View>
+      )}
+
       {/* Analysis Loading */}
       {isAnalyzing && (
-        <View style={styles.loadingCard}>
-          <Text style={styles.loadingText}>AI विश्लेषण हो रहा है...</Text>
-          <Text style={styles.loadingSubtext}>कृपया प्रतीक्षा करें</Text>
+        <View style={styles.section}>
+          <View style={styles.loadingCard}>
+            <ActivityIndicator size="large" color="#16A34A" />
+            <Text style={styles.loadingText}>AI विश्लेषण हो रहा है...</Text>
+            <Text style={styles.loadingSubtext}>कृपया प्रतीक्षा करें</Text>
+          </View>
         </View>
       )}

@@ .. @@
         <View style={styles.section}>
           <View style={styles.resultCard}>
             <View style={styles.resultHeader}>
-              <Text style={styles.diseaseTitle}>{analysisResult.disease}</Text>
+              <View style={styles.diseaseTitleContainer}>
+                <Text style={styles.cropName}>{analysisResult.crop}</Text>
+                <Text style={styles.diseaseTitle}>{analysisResult.disease}</Text>
+              </View>
               <View style={styles.confidenceBadge}>
                 <Text style={styles.confidenceText}>{analysisResult.confidence}% सटीक</Text>
               </View>
             </View>
+            
+            {/* Confidence Progress Bar */}
+            <View style={styles.progressContainer}>
+              <View style={styles.progressBar}>
+                <View 
+                  style={[
+                    styles.progressFill, 
+                    { width: `${analysisResult.confidence}%` }
+                  ]} 
+                />
+              </View>
+              <Text style={styles.progressText}>सटीकता: {analysisResult.confidence}%</Text>
+            </View>

             {/* Symptoms */}
             <View style={styles.resultSection}>
               <Text style={styles.resultSectionTitle}>🔍 लक्षण:</Text>
-              {analysisResult.symptoms.map((symptom: string, index: number) => (
+              {analysisResult.symptoms.map((symptom, index) => (
                 <Text key={index} style={styles.listItem}>• {symptom}</Text>
               ))}
             </View>

-            {/* Remedies */}
+            {/* Treatment */}
             <View style={styles.resultSection}>
               <Text style={styles.resultSectionTitle}>💊 उपचार:</Text>
-              {analysisResult.remedies.map((remedy: string, index: number) => (
-                <Text key={index} style={styles.listItem}>• {remedy}</Text>
+              {analysisResult.treatment.map((treatment, index) => (
+                <Text key={index} style={styles.listItem}>• {treatment}</Text>
               ))}
             </View>

             {/* Prevention */}
             <View style={styles.resultSection}>
               <Text style={styles.resultSectionTitle}>🛡️ बचाव:</Text>
-              {analysisResult.prevention.map((prevention: string, index: number) => (
+              {analysisResult.prevention.map((prevention, index) => (
                 <Text key={index} style={styles.listItem}>• {prevention}</Text>
               ))}
             </View>

-            <TouchableOpacity style={styles.voiceButton}>
-              <Ionicons name="volume-high" size={20} color="white" />
-              <Text style={styles.voiceButtonText}>आवाज में सुनें</Text>
+            <TouchableOpacity 
+              style={[styles.voiceButton, isSpeaking && styles.voiceButtonActive]}
+              onPress={speakResults}
+            >
+              <Ionicons 
+                name={isSpeaking ? "stop" : "volume-high"} 
+                size={20} 
+                color="white" 
+              />
+              <Text style={styles.voiceButtonText}>
+                {isSpeaking ? 'रोकें' : 'आवाज में सुनें'}
+              </Text>
             </TouchableOpacity>
           </View>
         </View>
@@ .. @@
   sectionTitle: {
     fontSize: 18,
     fontWeight: 'bold',
     color: '#1F2937',
     marginBottom: 12,
   },
+  imageOptionsContainer: {
+    flexDirection: 'row',
+    justifyContent: 'space-between',
+    marginTop: 20,
+  },
   cameraCard: {
     backgroundColor: 'white',
-    padding: 40,
+    width: '48%',
+    padding: 20,
     borderRadius: 16,
     alignItems: 'center',
-    marginTop: 20,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.1,
     shadowRadius: 8,
     elevation: 5,
   },
+  galleryCard: {
+    backgroundColor: 'white',
+    width: '48%',
+    padding: 20,
+    borderRadius: 16,
+    alignItems: 'center',
+    shadowColor: '#000',
+    shadowOffset: { width: 0, height: 4 },
+    shadowOpacity: 0.1,
+    shadowRadius: 8,
+    elevation: 5,
+  },
   cameraIcon: {
-    width: 100,
-    height: 100,
+    width: 60,
+    height: 60,
     backgroundColor: '#F0FDF4',
-    borderRadius: 50,
+    borderRadius: 30,
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: 16,
   },
+  galleryIcon: {
+    width: 60,
+    height: 60,
+    backgroundColor: '#F0FDF4',
+    borderRadius: 30,
+    justifyContent: 'center',
+    alignItems: 'center',
+    marginBottom: 16,
+  },
   cameraText: {
-    fontSize: 20,
-    fontWeight: 'bold',
+    fontSize: 14,
+    fontWeight: '600',
     color: '#1F2937',
-    marginBottom: 8,
+    textAlign: 'center',
   },
-  cameraSubtext: {
+  galleryText: {
     fontSize: 14,
-    color: '#6B7280',
+    fontWeight: '600',
+    color: '#1F2937',
     textAlign: 'center',
   },
+  imagePreviewContainer: {
+    alignItems: 'center',
+    backgroundColor: 'white',
+    padding: 16,
+    borderRadius: 12,
+  },
+  imagePreview: {
+    width: 200,
+    height: 200,
+    borderRadius: 12,
+    resizeMode: 'cover',
+  },
   camera: {
     flex: 1,
   },
@@ .. @@
   loadingCard: {
     backgroundColor: 'white',
-    margin: 20,
     padding: 30,
     borderRadius: 16,
     alignItems: 'center',
   },
   loadingText: {
     fontSize: 18,
     fontWeight: '600',
     color: '#16A34A',
-    marginBottom: 8,
+    marginTop: 16,
+    marginBottom: 8,
   },
   loadingSubtext: {
     fontSize: 14,
     color: '#6B7280',
   },
   resultCard: {
     backgroundColor: 'white',
     padding: 20,
     borderRadius: 16,
-    marginTop: 20,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.1,
     shadowRadius: 8,
     elevation: 5,
   },
   resultHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: 20,
   },
+  diseaseTitleContainer: {
+    flex: 1,
+  },
+  cropName: {
+    fontSize: 16,
+    fontWeight: '600',
+    color: '#16A34A',
+    marginBottom: 4,
+  },
   diseaseTitle: {
-    fontSize: 20,
+    fontSize: 18,
     fontWeight: 'bold',
     color: '#DC2626',
-    flex: 1,
   },
   confidenceBadge: {
     backgroundColor: '#22C55E',
     paddingHorizontal: 12,
     paddingVertical: 6,
     borderRadius: 12,
   },
   confidenceText: {
     color: 'white',
     fontSize: 12,
     fontWeight: '600',
   },
+  progressContainer: {
+    marginBottom: 20,
+  },
+  progressBar: {
+    height: 8,
+    backgroundColor: '#E5E7EB',
+    borderRadius: 4,
+    overflow: 'hidden',
+    marginBottom: 8,
+  },
+  progressFill: {
+    height: '100%',
+    backgroundColor: '#22C55E',
+    borderRadius: 4,
+  },
+  progressText: {
+    fontSize: 12,
+    color: '#6B7280',
+    textAlign: 'center',
+  },
   resultSection: {
     marginBottom: 20,
   },
@@ .. @@
     marginTop: 10,
   },
+  voiceButtonActive: {
+    backgroundColor: '#DC2626',
+  },
   voiceButtonText: {
     color: 'white',
     fontSize: 14,
     fontWeight: '600',
     marginLeft: 8,
   },