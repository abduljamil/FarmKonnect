import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Apple } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function DownloadApp() {

  const [deviceOS, setDeviceOS] = useState('Unknown');

  const androidApkUrl = "https://farmkonnect.app/farmkonnect.apk"; // Example URL
  const iosTestflightUrl = "https://testflight.apple.com/join/YOUR_TESTFLIGHT_LINK";

  useEffect(() => {
    // Detect OS
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/android/i.test(userAgent)) {
      setDeviceOS('Android');
      // Optional: Auto redirect to APK download
      // window.location.href = androidApkUrl;
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setDeviceOS('iOS');
      // Optional: Auto redirect to TestFlight
      // window.location.href = iosTestflightUrl;
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center py-20 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden p-8 text-center border border-gray-100 dark:border-gray-700">
        <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6">
          <Smartphone className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Get FarmKonnect
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          {deviceOS === 'Android' 
            ? "We've detected you are using Android. Download our secure APK directly to install FarmKonnect on your phone."
            : deviceOS === 'iOS'
            ? "We've detected you are using an iPhone/iPad. Join our TestFlight to install FarmKonnect."
            : "Download the FarmKonnect mobile app to stay connected to the mandi anywhere, anytime."}
        </p>

        <div className="space-y-4">
          <a
            href={androidApkUrl}
            className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold transition-all ${
              deviceOS === 'Android' || deviceOS === 'Unknown'
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/30'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Download className="w-5 h-5" />
            Download for Android (.APK)
          </a>

          <a
            href={iosTestflightUrl}
            className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold transition-all ${
              deviceOS === 'iOS'
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/30'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Apple className="w-5 h-5" />
            Get on iOS (TestFlight)
          </a>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 text-left">
          <p className="font-semibold mb-2">Android Installation Guide:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Tap "Download for Android" above.</li>
            <li>Open the downloaded `.apk` file.</li>
            <li>If prompted, tap "Settings" and enable "Allow from this source".</li>
            <li>Tap "Install" and you're done!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
