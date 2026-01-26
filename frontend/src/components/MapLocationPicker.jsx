import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Search } from "lucide-react";

export default function MapLocationPicker({ onLocationSelect, initialLocation, readonly = false }) {
  const [location, setLocation] = useState(initialLocation || null);
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );

    // Define the callback function globally
    window.initGoogleMap = () => {
      initMap();
    };

    const onLoad = () => initMap();
    const onError = () => {
      setLoading(false);
      setError("Failed to load Google Maps. Please check your connection or disable ad blockers.");
    };

    // Load Google Maps script only if not already loaded
    if (!window.google?.maps?.Map && !existingScript) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMap`;
      script.async = true;
      script.defer = true;
      script.addEventListener("error", onError);
      document.head.appendChild(script);
    } else if (window.google?.maps?.Map) {
      initMap();
    } else if (existingScript) {
      existingScript.addEventListener("load", onLoad);
      existingScript.addEventListener("error", onError);
    }

    return () => {
      // Cleanup global callback
      delete window.initGoogleMap;
      if (existingScript) {
        existingScript.removeEventListener("load", onLoad);
        existingScript.removeEventListener("error", onError);
      }
    };
  }, []);

  useEffect(() => {
    if (initialLocation && !location) {
      setLocation(initialLocation);
      setAddress(initialLocation.address || "");
    }
  }, [initialLocation]);

  useEffect(() => {
    if (location && onLocationSelect && !readonly) {
      onLocationSelect({
        latitude: location.lat,
        longitude: location.lng,
        address: address,
      });
    }
  }, [location, address]);

  const initMap = () => {
    try {
      if (!mapContainerRef.current || !window.google?.maps?.Map) return;

      const defaultLocation = location || initialLocation || { lat: 33.6844, lng: 73.0479 }; // Islamabad, Pakistan

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: defaultLocation,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        draggable: !readonly,
        disableDefaultUI: readonly,
      });

      mapInstanceRef.current = map;

      const marker = new window.google.maps.Marker({
        position: defaultLocation,
        map: map,
        draggable: !readonly,
        animation: window.google.maps.Animation.DROP,
      });

      markerRef.current = marker;

      if (readonly) return;

      // Update location when marker is dragged
      marker.addListener("dragend", () => {
        const position = marker.getPosition();
        const newLocation = { lat: position.lat(), lng: position.lng() };
        setLocation(newLocation);
        reverseGeocode(newLocation);
      });

      // Update location when map is clicked
      map.addListener("click", (e) => {
        const newLocation = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        marker.setPosition(newLocation);
        setLocation(newLocation);
        reverseGeocode(newLocation);
      });

      // Initialize Places Autocomplete
      initAutocomplete();

      // Get initial address if location exists
      if (location || initialLocation) {
        // If address is already provided in initialLocation, use it
        if (initialLocation?.address) {
          setAddress(initialLocation.address);
        } else {
          reverseGeocode(location || initialLocation);
        }
      }
    } catch (err) {
      console.error("Map initialization error:", err);
      setError("Map failed to load. Please check for ad blockers.");
    }
  };

  const initAutocomplete = () => {
    if (!searchInputRef.current || !window.google?.maps?.places || readonly) return;

    const autocomplete = new window.google.maps.places.Autocomplete(
      searchInputRef.current,
      {
        types: ["geocode", "establishment"],
        componentRestrictions: { country: "pk" }, // Restrict to Pakistan
      }
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();

      if (place.geometry && place.geometry.location) {
        const newLocation = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        setLocation(newLocation);
        setAddress(place.formatted_address || place.name);
        setSearchQuery(place.formatted_address || place.name);

        // Update map and marker
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(newLocation);
          mapInstanceRef.current.setZoom(16);
        }

        if (markerRef.current) {
          markerRef.current.setPosition(newLocation);
        }
      }
    });

    autocompleteRef.current = autocomplete;
  };

  const reverseGeocode = async (loc) => {
    if (!window.google?.maps?.Geocoder) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: loc }, (results, status) => {
      if (status === "OK" && results[0]) {
        setAddress(results[0].formatted_address);
      }
    });
  };

  const getCurrentLocation = () => {
    setLoading(true);
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(newLocation);

        if (markerRef.current) {
          markerRef.current.setPosition(newLocation);
        }

        // Pan the existing map instead of creating a new one
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(newLocation);
          mapInstanceRef.current.setZoom(15);
        }

        reverseGeocode(newLocation);
        setLoading(false);
      },
      (error) => {
        // Provide helpful error messages based on error code
        let errorMessage = "Unable to retrieve your location. ";
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage += "Please enable location permissions in your browser settings.";
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage += "Location services unavailable. You can search for your location instead.";
            break;
          case 3: // TIMEOUT
            errorMessage += "Location request timed out. Please try again.";
            break;
          default:
            errorMessage += "You can search for your location manually.";
        }
        setError(errorMessage);
        setLoading(false);

        // Fallback to default location (Lahore, Pakistan) if no location is set
        if (!location) {
          const defaultLocation = { lat: 31.5204, lng: 74.3587 };
          setLocation(defaultLocation);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo(defaultLocation);
            mapInstanceRef.current.setZoom(12);
          }
          if (markerRef.current) {
            markerRef.current.setPosition(defaultLocation);
          }
        }
      }
    );
  };

  const handleSearchSubmit = () => {
    // The autocomplete handles the search, but we can also do a manual geocode search
    if (!searchQuery.trim() || !window.google?.maps?.Geocoder) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      if (status === "OK" && results[0]) {
        const place = results[0];
        const newLocation = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        setLocation(newLocation);
        setAddress(place.formatted_address);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(newLocation);
          mapInstanceRef.current.setZoom(16);
        }

        if (markerRef.current) {
          markerRef.current.setPosition(newLocation);
        }
      } else {
        setError("Location not found. Please try a different search.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <MapPin className="w-4 h-4 inline mr-2" />
          {readonly ? "Delivery Location" : "Pin Delivery Location"}
        </label>
        {!readonly && (
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            <Navigation className="w-4 h-4" />
            {loading ? "Getting..." : "Use My Location"}
          </button>
        )}
      </div>

      {/* Search Input */}
      {!readonly && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchSubmit();
              }
            }}
            placeholder="Search for a location..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div
        ref={mapContainerRef}
        className="w-full h-64 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800"
      />

      {address && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {readonly ? "Pinned Address:" : "Selected Location:"}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{address}</p>
          {location && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
          )}
        </div>
      )}

      {!readonly && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Search for a location, click on the map, or drag the marker to select your delivery location
        </p>
      )}
    </div>
  );
}
