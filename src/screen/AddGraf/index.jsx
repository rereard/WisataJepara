import { Text, TouchableOpacity, View, StyleSheet, Dimensions, ToastAndroid, Button, Pressable } from "react-native";
import { ScrollView, TextInput } from "react-native-gesture-handler";
import { colors } from "../../utility/colors";
import { useRef, useState, useEffect, createRef, useMemo, useCallback } from "react";
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapView, { Callout, Marker, Polyline } from "react-native-maps";
import firestore from '@react-native-firebase/firestore';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { decode } from "@googlemaps/polyline-codec";
import Spinner from "react-native-loading-spinner-overlay";
import CheckBox from "@react-native-community/checkbox";
import { haversineDistance } from "../../utility/haversineDistance";
const { width, height } = Dimensions.get('window');
const SCREEN_HEIGHT = height
const SCREEN_WIDTH = width

export default function AddGraf({ navigation, route }) {

  const _map = useRef();
  const markerRefs = useRef([])
  const sheetRef = useRef()
  const resultSheetRef = useRef()

  const { dataNode } = route.params

  // const [dataNode, setDataNode] = useState(null)
  const [pressId, setPressId] = useState(null)
  const [dataGraf, setDataGraf] = useState(null)
  const [startNode, setStartNode] = useState(null)
  const [finalNode, setFinalNode] = useState(null)
  const [polyline, setPolyline] = useState(null)
  const [revPolyline, setRevPolyline] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [reversable, setReversable] = useState(false)
  const [drawMode, setDrawMode] = useState(false)
  const [drawedGraph, setDrawedGraph] = useState(null)
  const [midPoint, setMidPoint] = useState([])
  const [drawMarkerRegion, setDrawMarkerRegion] = useState(null)
  const [region, setRegion] = useState({
    latitude: -6.5811218,
    longitude: 110.6872181,
    latitudeDelta: 0.065,
    longitudeDelta: 0.065,
  })

  useEffect(() => {
    setLoading(true)
    const subscribeGraf = firestore().collection('graf').onSnapshot(querySnapshot => {
      const graf = [];
      querySnapshot.forEach(docSnapshot => {
        graf.push({
          id: docSnapshot.id,
          ...docSnapshot.data()
        })
      })
      console.log("fetch snapshot graf");
      setDataGraf(graf)
      setLoading(false)
    })
    return () => {
      subscribeGraf()
    };
  }, []);

  useEffect(() => {
    if (polyline) {
      const graph = [
        {
          latitude: startNode?.latitude,
          longitude: startNode?.longitude
        },
        {
          latitude: finalNode?.latitude,
          longitude: finalNode?.longitude
        }
      ]
      setDrawedGraph({
        geoJson: graph,
        distanceMeters: calculateDrawedGraphDistance(graph)
      })
    }
  }, [polyline, drawMode]);

  useEffect(() => {
    console.log("draw", drawedGraph);
    if (drawedGraph) {
      console.log("draw graph distance", calculateDrawedGraphDistance(drawedGraph?.geoJson));
    }
  }, [drawedGraph]);

  const fetchGraph = async (startNode, finalNode) => {
    setLoading(true)
    try {
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: "same-origin",
        headers: {
          'X-Goog-Api-Key': 'AIzaSyB1YlScE_CVKiumq71EoyFLnl0lykUv2EQ',
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
          "origin": {
            "location": {
              "latLng": {
                "latitude": startNode?.latitude,
                "longitude": startNode?.longitude
              }
            }
          },
          "destination": {
            "location": {
              "latLng": {
                "latitude": finalNode?.latitude,
                "longitude": finalNode?.longitude
              }
            }
          },
          "travelMode": "DRIVE",
          "routingPreference": "TRAFFIC_AWARE",
          "polylineQuality": "OVERVIEW",
          "computeAlternativeRoutes": false,
          "routeModifiers": {
            "avoidTolls": false,
            "avoidHighways": false,
            "avoidFerries": false
          },
          "languageCode": "en-US",
          "units": "IMPERIAL"
        })
      })
      return response.json()
    } catch (e) {
      console.log("error\n", e);
      setLoading(false)
    }
  }

  const handleCloseSheet = useCallback(() => {
    sheetRef.current?.close()
  }, [])
  const handleSnapSheet = useCallback((index) => {
    sheetRef.current?.snapToIndex(index)
  }, [])
  const handleSheetChanges = useCallback((index) => {
    console.log('handleSheetChanges', index);
  }, []);
  const calculateGrafRegion = useCallback((startNode, finalNode) => {
    const midLatitude = (startNode?.latitude + finalNode?.latitude) / 2
    const midLongitude = (startNode?.longitude + finalNode?.longitude) / 2
    const latitudeDelta = Math.abs(startNode?.latitude - finalNode?.latitude) * 1.5
    const longitudeDelta = Math.abs(startNode?.longitude - finalNode?.longitude) * 1.5
    return {
      latitude: midLatitude,
      longitude: midLongitude,
      latitudeDelta,
      longitudeDelta
    }
  }, [])
  const calculateDrawedGraphDistance = useCallback((graph) => {
    let totalDistance = 0;
    for (let i = 0; i < graph?.length - 1; i++) {
      totalDistance += haversineDistance(graph[i], graph[i + 1])
    }
    return Math.round(totalDistance)
  }, [])

  const snapPoints = useMemo(() => ["20%", "30%", "40%", "45%"], []);

  return (
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
        flex: 1,
        justifyContent: drawMode ? 'center' : null,
        alignItems: drawMode ? 'center' : null
      }}
    >
      {drawMode && (
        <Ionicons
          name={'add-outline'}
          style={{
            zIndex: 3,
            fontSize: 25,
            color: colors.black,
            position: 'absolute',
            paddingBottom: 12
          }}
        />
      )}
      <MapView
        ref={_map}
        style={{
          ...StyleSheet.absoluteFillObject
        }}
        region={region}
        onPress={() => {
          handleCloseSheet()
          setSheetVisible(false)
        }}
        onRegionChangeComplete={(region) => {
          setDrawMarkerRegion({
            latitude: region.latitude,
            longitude: region.longitude
          })
        }}
        loadingEnabled={true}
        customMapStyle={[
          {
            "featureType": "administrative",
            "elementType": "geometry",
            "stylers": [
              {
                "visibility": "off"
              }
            ]
          },
          {
            "featureType": "poi",
            "stylers": [
              {
                "visibility": "off"
              }
            ]
          },
          {
            "featureType": "road",
            "elementType": "labels.icon",
            "stylers": [
              {
                "visibility": "off"
              }
            ]
          },
          {
            "featureType": "transit",
            "stylers": [
              {
                "visibility": "off"
              }
            ]
          }
        ]}
      >
        {dataNode?.map((item, index) => (
          item?.tipe == 2 ?
            <Marker
              key={item?.id}
              title={item?.nama}
              coordinate={({
                latitude: item?.latitude,
                longitude: item?.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              })}
              tracksViewChanges={false}
              ref={markerRefs?.current[index]}
              onPress={() => {
                if (polyline && drawedGraph) {
                  handleCloseSheet()
                  setSheetVisible(false)
                } else {
                  if (!startNode && !finalNode) {
                    console.log("this");
                    setPressId(item?.id)
                    handleSnapSheet(0)
                    setSheetVisible(true)
                  } else if (startNode || !finalNode) {
                    if (dataGraf?.find(i => (i?.finalNodeId === item?.id) && (i?.startNodeId === startNode?.id))?.startNodeId === startNode?.id) {
                      handleCloseSheet()
                      setSheetVisible(false)
                    } else {
                      setPressId(item?.id)
                      handleSnapSheet(0)
                      setSheetVisible(true)
                    }
                  } else if (startNode?.id === item?.id || finalNode?.id === item?.id) {
                    setPressId(item?.id)
                    handleSnapSheet(0)
                    setSheetVisible(true)
                  } else {
                    console.log("that");
                    handleCloseSheet()
                    setSheetVisible(false)
                  }
                }
              }}
            >
              <NodeMarker
                color={startNode || finalNode ?
                  startNode?.id === item?.id ?
                    colors.green :
                    finalNode?.id === item?.id ?
                      colors.purple : colors.black :
                  colors.black
                }
              />
            </Marker>
            :
            <Marker.Animated
              key={item?.id}
              coordinate={({
                latitude: item?.latitude,
                longitude: item?.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              })}
              tracksViewChanges={false}
              onPress={() => {
                if (polyline || drawedGraph) {
                  handleCloseSheet()
                  setSheetVisible(false)
                } else {
                  if (!startNode && !finalNode) {
                    setPressId(item?.id)
                    handleSnapSheet(0)
                    setSheetVisible(true)
                  } else if (startNode || !finalNode) {
                    if (dataGraf?.find(i => (i?.finalNodeId === item?.id) && (i?.startNodeId === startNode?.id))?.startNodeId === startNode?.id) {
                      handleCloseSheet()
                      setSheetVisible(false)
                    } else {
                      setPressId(item?.id)
                      handleSnapSheet(0)
                      setSheetVisible(true)
                    }
                  } else if (startNode?.id === item?.id || finalNode?.id === item?.id) {
                    setPressId(item?.id)
                    handleSnapSheet(0)
                    setSheetVisible(true)
                  } else {
                    handleCloseSheet()
                    setSheetVisible(false)
                  }
                }
              }}
            >
              <View style={{
                width: 100,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{
                  color: colors.black,
                  fontWeight: '900',
                  fontSize: 10,
                  textAlign: 'center'
                }}>{item?.nama}</Text>
                <CustomMarker
                  color={startNode || finalNode ?
                    startNode?.id === item?.id ?
                      colors.green :
                      finalNode?.id === item?.id ?
                        colors.purple : colors.darkBlue :
                    colors.darkBlue
                  }
                />
              </View>
            </Marker.Animated>
        ))}
        {drawMode ? midPoint.length != 0 && (
          midPoint?.map((item, index) => (
            <Marker
              key={index}
              coordinate={item}
              tracksViewChanges={false}
            >
              <View style={{
                width: 100,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{
                  color: colors.black,
                  fontWeight: '900',
                  fontSize: 10,
                  textAlign: 'center'
                }}>{index + 1}</Text>
                <MidMarker />
              </View>
            </Marker>
          ))
        ) : null}
        {dataGraf?.map(item => (
          <Polyline
            key={item?.id}
            coordinates={item?.polyline}
            strokeWidth={3}
            strokeColor={colors.darkBlue}
          />
        ))}
        {polyline && (
          drawMode ?
            <Polyline
              coordinates={drawedGraph?.geoJson}
              strokeWidth={3}
              strokeColor={colors.red}
            /> :
            <Polyline
              coordinates={polyline?.geoJson}
              strokeWidth={3}
              strokeColor={colors.red}
            />
        )}
        {revPolyline && (
          <Polyline
            coordinates={revPolyline?.geoJson}
            strokeWidth={3}
            strokeColor={colors.red}
          />
        )}
      </MapView>
      <Spinner
        visible={loading}
        textContent="Loading..."
      />
      {!polyline && (
        <>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            margin: 10,
            backgroundColor: colors.green,
            padding: 7,
            borderRadius: 10,
          }}>
            {startNode ? (
              <>
                <Ionicons
                  name={"location-sharp"}
                  style={{ color: colors.white, fontSize: 30 }}
                />
                <Text
                  style={{
                    color: colors.white,
                    fontWeight: '700',
                    fontSize: 15,
                    marginLeft: 5
                  }}
                >
                  {startNode?.nama}
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name={"information-circle-outline"}
                  style={{ color: colors.white, fontSize: 35 }}
                />
                <Text
                  style={{
                    color: colors.white,
                    fontWeight: '700',
                    fontSize: 17,
                    marginLeft: 7
                  }}
                >
                  Pilih node awal
                </Text>
              </>
            )}
          </View>
          {startNode ? (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: 10,
              backgroundColor: colors.purple,
              padding: 7,
              borderRadius: 10
            }}>
              {finalNode ? (
                <>
                  <Ionicons
                    name={"location-sharp"}
                    style={{ color: colors.white, fontSize: 30 }}
                  />
                  <Text
                    style={{
                      color: colors.white,
                      fontWeight: '700',
                      fontSize: 15,
                      marginLeft: 5
                    }}
                  >
                    {finalNode?.nama}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name={"information-circle-outline"}
                    style={{ color: colors.white, fontSize: 35 }}
                  />
                  <Text
                    style={{
                      color: colors.white,
                      fontWeight: '700',
                      fontSize: 17,
                      marginLeft: 7
                    }}
                  >
                    Pilih node tujuan
                  </Text>
                </>
              )}
            </View>
          ) : null}
        </>
      )}
      {polyline && (
        <BottomSheet
          ref={resultSheetRef}
          index={0}
          snapPoints={drawMode ? snapPoints : null}
          enableDynamicSizing={drawMode ? false : true}
          style={{
            paddingHorizontal: 10,
            paddingBottom: 20,
          }}
        >
          <BottomSheetScrollView
            contentContainerStyle={{
              paddingBottom: 25
            }}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: "space-between"
            }}>
              <View
                style={{
                  flex: 1
                }}
              >
                <Text style={{
                  fontWeight: '900',
                  color: colors.green,
                  fontSize: 17,
                  marginBottom: 4,
                }}>
                  {startNode?.nama}
                </Text>
              </View>
              <View
                style={{
                  width: 50,
                  alignItems: 'center'
                }}
              >
                <Ionicons
                  name={"chevron-forward-outline"}
                  style={{ color: colors.darkBlue, fontSize: 30 }}
                />
                <Text
                  style={{
                    color: colors.darkBlue,
                    fontWeight: 'bold'
                  }}
                >
                  {drawMode ? drawedGraph?.distanceMeters : polyline?.distanceMeters} m
                </Text>
                {revPolyline && (
                  <>
                    <Ionicons
                      name={'chevron-back-outline'}
                      style={{ color: colors.darkBlue, fontSize: 30 }}
                    />
                    <Text
                      style={{
                        color: colors.darkBlue,
                        fontWeight: 'bold'
                      }}
                    >
                      {revPolyline?.distanceMeters} m
                    </Text>
                  </>
                )}
              </View>
              <View
                style={{
                  flex: 1,
                  alignItems: 'flex-end'
                }}
              >
                <Text style={{
                  fontWeight: '900',
                  color: colors.purple,
                  fontSize: 17,
                  marginBottom: 4,
                }}>
                  {finalNode?.nama}
                </Text>
              </View>
            </View>
            {drawMode ? (
              <>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.darkBlue,
                    borderRadius: 15,
                    alignItems: 'center',
                    paddingVertical: 10,
                    flex: 1,
                    shadowColor: "#000",
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                    marginVertical: 15
                  }}
                  onPress={() => {
                    const titikTengah = midPoint
                    const graf = [...drawedGraph?.geoJson]
                    titikTengah.push(drawMarkerRegion)
                    console.log("titik tengah", titikTengah);
                    console.log("graf", graf);
                    graf.splice(graf.length - 1, 0, drawMarkerRegion)
                    console.log("graf tambah", graf);
                    const distance = calculateDrawedGraphDistance(graf)
                    setMidPoint(titikTengah)
                    setDrawedGraph({
                      distanceMeters: distance,
                      geoJson: graf
                    })
                  }}
                >
                  <Text
                    style={{
                      color: colors.white,
                      fontSize: 15,
                      fontWeight: '700',
                    }}
                  >
                    Tambahkan Titik Tengah
                  </Text>
                </TouchableOpacity>
                {midPoint.length !== 0 && (
                  <View
                    style={{
                      marginBottom: 15
                    }}
                  >
                    {midPoint.map((item, index) => (
                      <View
                        key={index}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 10,
                          borderBottomWidth: 2,
                          borderColor: 'rgba(196, 196, 196, 0.5)',
                          flexDirection: 'row',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Text
                          style={{
                            color: colors.black,
                            fontWeight: 'bold',
                            fontSize: 14
                          }}
                        >
                          Titik Tengah {index + 1}
                        </Text>
                        {index === midPoint.length - 1 && (
                          <TouchableOpacity
                            onPress={() => {
                              const titikTengah = midPoint
                              const graf = [...drawedGraph?.geoJson]
                              titikTengah.pop()
                              graf.splice(graf.length - 2, 1)
                              const distance = calculateDrawedGraphDistance(graf)
                              setMidPoint(titikTengah)
                              setDrawedGraph({
                                distanceMeters: distance,
                                geoJson: graf
                              })
                            }}
                          >
                            <Ionicons
                              name={"trash"}
                              style={{ color: colors.red, fontSize: 20 }}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>

                )}
              </>
            ) : (
              <>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginVertical: 10
                }}>
                  <CheckBox
                    value={reversable}
                    onValueChange={(value) => {
                      setReversable(value)
                      if (!value) {
                        setRevPolyline(null)
                      } else {
                        fetchGraph(finalNode, startNode).then(data => {
                          console.log('reverse polyline', data);
                          const decPoly = decode(data.routes[0].polyline.encodedPolyline, 5)
                          const geoJson = decPoly.map(c => ({ latitude: c[0], longitude: c[1] }));
                          console.log("geojson", geoJson);
                          setRevPolyline({
                            geoJson: geoJson,
                            distanceMeters: data.routes[0].distanceMeters
                          })
                          setLoading(false)
                        })
                      }
                    }}
                    tintColors={{
                      true: colors.darkBlue,
                      false: colors.darkBlue
                    }}
                    style={{
                      transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }]
                    }}
                  />
                  <Text
                    style={{
                      color: colors.black,
                      fontWeight: 'bold',
                      fontSize: 16
                    }}
                  >
                    Dua Arah
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    paddingVertical: 10,
                    borderTopWidth: 0.5,
                    borderBottomWidth: 0.5,
                    borderColor: colors.darkGrey,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 20
                  }}
                  onPress={() => {
                    setDrawMode(true)
                    setReversable(false)
                    setRevPolyline(null)
                  }}
                >
                  <Text
                    style={{
                      color: colors.black
                    }}
                  >
                    Bila tidak sesuai, gambar rute sendiri (searah)
                  </Text>
                  <Ionicons
                    name={"chevron-forward-outline"}
                    style={{ color: colors.darkGrey, fontSize: 20 }}
                  />
                </TouchableOpacity>
              </>
            )}
            <View
              style={{
                flexDirection: 'row'
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  if (drawMode) {
                    setDrawMode(false)
                    setMidPoint([])
                    setDrawedGraph(null)
                    setPressId(null)
                  } else {
                    setSheetVisible(false)
                    setPolyline(null)
                    setRevPolyline(null)
                    setStartNode(null)
                    setFinalNode(null)
                    setReversable(false)
                    setPressId(null)
                  }
                }}
                style={{
                  backgroundColor: colors.red,
                  borderRadius: 15,
                  alignItems: 'center',
                  paddingVertical: 10,
                  flex: 1,
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
              >
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Batalkan
                </Text>
              </TouchableOpacity>
              <View
                style={{
                  width: 15
                }}
              >

              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.darkBlue,
                  borderRadius: 15,
                  alignItems: 'center',
                  paddingVertical: 10,
                  flex: 1,
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
                onPress={() => {
                  setLoading(true)
                  firestore().collection('graf').add({
                    startNodeId: startNode?.id,
                    finalNodeId: finalNode?.id,
                    polyline: drawMode ? drawedGraph?.geoJson : polyline?.geoJson,
                    jarak: drawMode ? drawedGraph?.distanceMeters : polyline?.distanceMeters,
                    region: calculateGrafRegion(startNode, finalNode)
                  }).then(doc => {
                    if (revPolyline) {
                      firestore().collection('graf').add({
                        startNodeId: finalNode?.id,
                        finalNodeId: startNode?.id,
                        polyline: revPolyline?.geoJson,
                        jarak: revPolyline?.distanceMeters,
                        region: calculateGrafRegion(finalNode, startNode)
                      }).then(doc => {
                        setLoading(false)
                        ToastAndroid.show('Berhasil menambah graf', ToastAndroid.SHORT)
                        setDrawMode(false)
                        setMidPoint([])
                        setDrawedGraph(null)
                        setSheetVisible(false)
                        setPolyline(null)
                        setRevPolyline(null)
                        setStartNode(null)
                        setFinalNode(null)
                        setReversable(false)
                        setPressId(null)
                      }).catch(e => {
                        console.log(e);
                        ToastAndroid.show('Gagal menambahkan data', ToastAndroid.SHORT)
                      })
                    } else {
                      setLoading(false)
                      ToastAndroid.show('Berhasil menambah graf', ToastAndroid.SHORT)
                      setDrawMode(false)
                      setMidPoint([])
                      setDrawedGraph(null)
                      setSheetVisible(false)
                      setPolyline(null)
                      setRevPolyline(null)
                      setStartNode(null)
                      setFinalNode(null)
                      setReversable(false)
                      setPressId(null)
                    }
                  }).catch(e => {
                    console.log(e);
                    ToastAndroid.show('Gagal menambahkan data', ToastAndroid.SHORT)
                  })
                }}
              >
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Tambahkan Graf
                </Text>
              </TouchableOpacity>
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      )}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        enableDynamicSizing={true}
        style={{
          paddingHorizontal: 10,
          paddingBottom: 20,
        }}
        enablePanDownToClose={true}
        onChange={handleSheetChanges}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingBottom: 25
          }}
        >
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: "space-between"
          }}>
            <View
              style={{
                flex: 1
              }}
            >
              <Text style={{
                fontWeight: '900',
                color: colors.black,
                fontSize: 20,
                marginBottom: 4,
              }}>
                {pressId ? dataNode?.find(item => item?.id === pressId).nama : "Ini nama objek wisata"}
              </Text>
            </View>
            <Ionicons
              name={"close-circle-outline"}
              style={{ color: colors.red, fontSize: 40 }}
              onPress={() => {
                handleCloseSheet()
                setSheetVisible(false)
              }}
            />
          </View>
          {pressId === startNode?.id || finalNode?.id === pressId ? (
            <TouchableOpacity
              style={{
                backgroundColor: colors.red,
                borderRadius: 15,
                alignItems: 'center',
                paddingVertical: 10,
                flex: 1,
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
                marginTop: 10
              }}
              onPress={() => {
                if (pressId === startNode?.id) {
                  setStartNode(null)
                  setFinalNode(null)
                } else if (pressId === finalNode?.id) {
                  setFinalNode(null)
                }
                handleCloseSheet()
                setSheetVisible(false)
              }}
            >
              <Text
                style={{
                  color: colors.white,
                  fontSize: 15,
                  fontWeight: '700',
                }}
              >
                Batalkan node ini
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: startNode ? colors.purple : colors.green,
                borderRadius: 15,
                alignItems: 'center',
                paddingVertical: 10,
                flex: 1,
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
                marginTop: 10
              }}
              onPress={() => {
                if (startNode) {
                  setFinalNode(dataNode?.find(item => item?.id === pressId))
                } else {
                  setStartNode(dataNode?.find(item => item?.id === pressId))
                }
                handleCloseSheet()
                setSheetVisible(false)
              }}
            >
              {startNode ? (
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Jadikan node tujuan
                </Text>
              ) : (
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Jadikan node awal
                </Text>
              )}
            </TouchableOpacity>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
      {startNode && finalNode && !sheetVisible && !polyline ? (
        <TouchableOpacity
          onPress={() => {
            fetchGraph(startNode, finalNode).then(data => {
              console.log('polyline', data);
              const decPoly = decode(data.routes[0].polyline.encodedPolyline, 5)
              const geoJson = decPoly.map(c => ({ latitude: c[0], longitude: c[1] }));
              console.log("geoJSON", geoJson);
              setPolyline({
                geoJson: geoJson,
                distanceMeters: data.routes[0].distanceMeters
              })
              handleCloseSheet()
              setLoading(false)
            })
          }}
          style={{
            backgroundColor: colors.darkBlue,
            borderRadius: 15,
            alignItems: 'center',
            paddingVertical: 10,
            alignSelf: 'center',
            position: 'absolute',
            bottom: '10%',
            flexDirection: 'row',
            width: SCREEN_WIDTH * 0.90,
            justifyContent: 'space-around',
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            marginTop: 10,
          }}
        >
          <Text
            style={{
              color: colors.white,
              fontSize: 15,
              fontWeight: '700'
            }}
          >
            Buat Graf
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignSelf: 'flex-start',
  },
  bubble: {
    width: 140,
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: '#4da2ab',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    borderColor: '#007a87',
    borderWidth: 0.5,
  },
  amount: {
    flex: 1,
  },
  arrow: {
    backgroundColor: 'transparent',
    borderWidth: 16,
    borderColor: 'transparent',
    borderTopColor: '#4da2ab',
    alignSelf: 'center',
    marginTop: -32,
  },
  arrowBorder: {
    backgroundColor: 'transparent',
    borderWidth: 16,
    borderColor: 'transparent',
    borderTopColor: '#007a87',
    alignSelf: 'center',
    marginTop: -0.5,
  },
});

function CustomMarker({ color }) {
  return (
    <Ionicons name={'location-sharp'}
      style={{
        fontSize: 40,
        color: color
      }}
    />
  );
}
function NodeMarker({ color }) {
  return (
    <Ionicons name={'ellipse-sharp'}
      style={{
        fontSize: 12,
        color: color
      }}
    />
  );
}
function MidMarker() {
  return (
    <Ionicons name={'caret-down'}
      style={{
        fontSize: 10,
        color: colors.black
      }}
    />
  );
}

function CustomCallout({ markerRefs, item }) {
  <Callout
    tooltip
    onPress={() => {
      console.log("refs", markerRefs?.current[index]);
    }}
  >
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 200,
        backgroundColor: '#fff',
        borderColor: colors.darkBlue,
        borderWidth: 1.5,
        borderRadius: 20,
        elevation: 10,
        padding: 8
      }}
    >
      <Text
        style={{
          color: colors.black,
          fontWeight: '700',
          fontSize: 16,
          marginBottom: 7
        }}
      >
        {item?.nama}
      </Text>
      <Text
        style={{
          color: colors.black,
          marginBottom: 10
        }}
      >
        Pilih sebagai node awal?
      </Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around'
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: colors.red,
            alignItems: 'center',
            borderRadius: 99,
            padding: 5
          }}
          onPress={() => {
            console.log("refs", markerRefs?.current[index]);
            markerRefs?.current[index].hideCallout()
          }}
        >
          <Ionicons name={'close'}
            style={{
              fontSize: 35,
              color: colors.white
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: colors.green,
            alignItems: 'center',
            borderRadius: 99,
            padding: 5
          }}
          onPress={() => {

          }}
        >
          <Ionicons name={'checkmark'}
            style={{
              fontSize: 35,
              color: colors.white
            }}
          />
        </TouchableOpacity>
      </View>
    </View>
  </Callout>
}