import React, { useState, useRef, useMemo, useCallback } from 'react'
import { useJsApiLoader, GoogleMap, MarkerF, Autocomplete, DirectionsRenderer, CircleF } from '@react-google-maps/api'
import logo from './assets/tiny_pin.svg'
import currentLocation from './assets/locations.png'
import { useEffect } from 'react'

const circleOptions = {
  strokeColor: '#0f52ba',
  strokeOpacity: 0.7,
  strokeWeight: 2,
  fillColor: '#0000ff99',
  fillOpacity: 0.4,
  clickable: false,
  draggable: false,
  editable: false,
  visible: true,
  radius: 100,
  zIndex: 1
}

function Map() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyBqq2my6V_JM5zZjCuoz6IZpH4ZgO64So8", // getting api key from env not working ( if you see don't misuse, I will be deleting after some time )
    libraries: ["places"],
    // googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  })
  // setting map and its center position
  const [map, setMap] = useState(/** @type google.maps.Map */(null))
  const center = useMemo(() => ({ lat: 23.344, lng: 85.31 }), []); // {lat: 23.344, lng: 85.31}
  const [location, setLocation] = useState(() => center); // changes based on marker
  const [zoomLevel, setZoomLevel] = useState(10);

  const [originCords, setoriginCords] = useState(null) // lat lng of origin
  const [destinationCords, setdestinationCords] = useState(null) // lat lng of destination


  // direction and distance matrix
  const [directionResponse, setDirectionResponse] = useState(null)
  const [direction, setDirection] = useState('')
  const [duration, setDuration] = useState('')
  const [price, setPrice] = useState(null)

  const originRef = useRef();
  const destinationRef = useRef();
  let origin, destination;

  async function calculateRoute() {
    // origin = originRef.current.value; 
    origin = originCords //{ lat: 23.078, lng: 85.264 }
    destination = destinationCords // { lat: 23.076, lng: 85.279 }

    if (origin === '' && destination === '') return;

    console.log('origin : ', origin, destination)

    const directionService = new google.maps.DirectionsService()

    const result = await directionService.route({
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING
    })

    let distanceValue = result.routes[0].legs[0].distance.value // meters
    let durationValue = result.routes[0].legs[0].duration.value // minutes

    let INITIAL_BOOK_CHARGE = 50; // initial book charge
    let BASE_FARE = 14; // charge per km
    let PRICE_PER_MIN = 0.06;
    let calculatedPrice = (INITIAL_BOOK_CHARGE + ((distanceValue / 1000) * BASE_FARE) + (durationValue * PRICE_PER_MIN)).toFixed(2);

    setPrice(calculatedPrice);

    setDirectionResponse(result)
    console.log('result : ', result)
    setDirection(result.routes[0].legs[0].distance.text)
    setDuration(result.routes[0].legs[0].duration.text)

  }

  // clear routes
  function clearRoute() {
    // setoriginCords(null)
    // setdestinationCords(null)
    // setLocation(center);
    // originRef.current.value = '';
    // destinationRef.current.value = '';
    // setDirectionResponse(null)
    // setDirection('')
    // setDuration('')
  }

  // get current location using GeoLocation API
  function getCurrentLocation() {
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    for (let i = 1; i <= 4; i++) {
      setTimeout(() => {
        setZoomLevel(10 + 2 * i);
      }, 250 * i)
    }


    function success(pos) {
      console.log('loc : ', location)
      const crd = pos.coords;

      console.log(`Latitude : ${crd.latitude}`);
      console.log(`Longitude: ${crd.longitude}`);

      setLocation({ lat: crd.latitude, lng: crd.longitude })
      originRef.current.value = `${crd.latitude}, ${crd.longitude}`
      map.panTo({ lat: crd.latitude, lng: crd.longitude })
      setoriginCords({ lat: crd.latitude, lng: crd.longitude })
    }

    function error(err) {
      console.warn(`ERROR(${err.code}): ${err.message}`);
    }

    navigator.geolocation.getCurrentPosition(success, error, options);

  }

  function handleMarkerDrag(e, isOrigin) {
    let newLat = parseFloat(e.latLng.lat().toFixed(3));
    let newLng = parseFloat(e.latLng.lng().toFixed(3))

    setoriginCords({ lat: newLat, lng: newLng })
    originRef.current.value = `${newLat}, ${newLng}`
  }

  function handleDestinationMarker(e) {
    let newLat = parseFloat(e.latLng.lat().toFixed(3));
    let newLng = parseFloat(e.latLng.lng().toFixed(3))

    setdestinationCords({ lat: newLat, lng: newLng })
    destinationRef.current.value = `${newLat}, ${newLng}`

  }

  function handlePlaceSelected(isOrigin) {
    let searchPlace = isOrigin ? originRef.current.value : destinationRef.current.value;
    var request = {
      query: searchPlace,
      fields: ['name', 'geometry'],
    };
    let service = new google.maps.places.PlacesService(map);
    console.log('search place : ', searchPlace, request)

    service.findPlaceFromQuery(request, function (results, status) {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        console.log('result : ', results)
        let lat = parseFloat(results[0].geometry.location.lat().toFixed(3));
        let lng = parseFloat(results[0].geometry.location.lng().toFixed(3));

        console.log('latLng origin : ', { lat, lng })

        if (isOrigin) {
          setoriginCords({ lat, lng })
        } else {
          console.log('dest')
          setdestinationCords({ lat, lng })
        }

        setLocation({ lat, lng })
        map.panTo({ lat, lng })
        for (let i = 1; i <= 4; i++) {
          setTimeout(() => {
            setZoomLevel(10 + 2 * i);
          }, 250 * i)
        }
      }
    });
  }


  if (!isLoaded) return <div>Loading...</div>

  return (
    <div className="relative w-full h-screen bg-lime-600">

      <div className="absolute bg-gray-500 w-full h-screen">
        {/* Google Map */}
        <GoogleMap
          center={location}
          zoom={zoomLevel}
          mapContainerStyle={{ width: '100%', height: '100%' }}
          onLoad={(map) => setMap(map)}
          options={{
            zoomControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            mapTypeControl: false
          }}
        >

          {/* Display Markers, InfoWindow, Direction etc. */}
          {
            location && (
              <MarkerF
                position={location}
                draggable={true}
                style={{ width: "30px", height: "30px" }}
                icon={{
                  url: logo,
                }}
                onDragEnd={handleMarkerDrag}
              />
            )
          }

          {
            destinationCords && (
              <MarkerF
                position={destinationCords}
                draggable={true}
                style={{ width: "30px", height: "30px" }}
                icon={{
                  url: logo,
                }}
                onDragEnd={handleDestinationMarker}
              />
            )
          }

          {
            location && (
              <CircleF
                center={location}
                options={circleOptions}
              />
            )
          }


          {directionResponse && <DirectionsRenderer directions={directionResponse} />}
        </GoogleMap>

      </div>
      <div className="absolute w-full h-20 flex flex-col justify-start items-start bg-opacity-0 drop-shadow">

        <div className="w-full lg:w-1/4 h-full p-2 rounded-sm bg-opacity-0">

          <div className="w-full lg:w-full h-full bg-opacity-0">
            <div className="bg-slate-50 w-full h-1/2 border-b flex justify-between border-solid border-black">
              <Autocomplete onPlaceChanged={() => handlePlaceSelected(true)} className="w-4/5 h-full">
                <input type="text" placeholder="Origin" className="w-full h-full p-2" ref={originRef} />
              </Autocomplete>
              <div className="w-1/5 h-full flex justify-center items-center">
                <button onClick={getCurrentLocation}><img src={currentLocation} alt="current_location" className="w-full h-full" /></button>
              </div>
            </div>
            <div className="w-full h-1/2 mt-2">
              <Autocomplete onPlaceChanged={() => handlePlaceSelected(false)}>
                <input type="text" placeholder="Destination" className="w-full h-full p-2" ref={destinationRef} />
              </Autocomplete>
            </div>
          </div>

        </div>

        <div className="h-full w-full lg:w-1/4 mt-2 flex justify-between items-center p-2">
          <button className="w-1/2 border border-solid border-white bg-blue-700 px-6 py-2 text-white rounded-md mr-2"
            onClick={clearRoute}
          >Clear</button>
          <button className="w-1/2 border border-solid border-white bg-blue-700 px-6 py-2 text-white rounded-md"
            onClick={calculateRoute}
          >Go</button>
        </div>

      </div>

      {price &&
        (<div className="absolute bg-slate-500 bg-opacity-0.2 w-full bottom-2 p-2">
          <div className="w-full flex justify-center items-center">Distance : {direction}</div>
          <div className="w-full flex justify-center items-center">Duration : {duration}</div>

          <div className="w-full flex justify-center items-center">Total Fare : {price}</div>

        </div>)
      }


    </div>
  )
}

export default Map