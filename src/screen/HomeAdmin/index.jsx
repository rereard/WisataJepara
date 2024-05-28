import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ToastAndroid, Pressable, Image, Keyboard, VirtualizedList } from "react-native";
import Modal from "react-native-modal";
import MapView, { Polyline } from "react-native-maps";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { Marker, AnimatedRegion } from "react-native-maps";
import GetLocation from 'react-native-get-location';
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFooter, BottomSheetTextInput, BottomSheetModalProvider, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from "../../utility/colors";
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import firestore from '@react-native-firebase/firestore';
import { ScrollView, TextInput } from "react-native-gesture-handler";
import { decode } from "@googlemaps/polyline-codec";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import auth from '@react-native-firebase/auth';
import Spinner from "react-native-loading-spinner-overlay";
import { buildGraph } from "../../utility/buildGraph";
import { dijkstra } from "../../utility/dijkstra";
import ImageView from 'react-native-image-viewing'
import storage from '@react-native-firebase/storage';
import { formatIDR } from "../../utility/formatIDR";
const { width, height } = Dimensions.get('window')
const SCREEN_HEIGHT = height
const SCREEN_WIDTH = width

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

export default function HomeAdmin({ route, navigation }) {


  const [pressId, setPressid] = useState(null)
  const [pressNodeId, setPressNodeId] = useState(null)
  const [dataNode, setDataNode] = useState(null)
  const [dataGraf, setDataGraf] = useState(null)
  const [loading, setLoading] = useState(false)
  const [chooseMode, setChooseMode] = useState(false)
  const [adjacencyList, setAdjacencyList] = useState(null)
  const [dijkstraPoly, setDijkstraPoly] = useState(null)
  const [pressGraphId, setPressGraphId] = useState(null)
  const [searchObjek, setSearchObjek] = useState('')
  const [filteredObjekWisata, setFilteredObjekWisata] = useState(null)
  const [filteredNode, setFilteredNode] = useState(null)
  const [filteredGraph, setFilteredGraph] = useState();
  const [filterReversiblePolyline, setFilterReversiblePolyline] = useState(null)
  const [currentGrafNodes, setCurrentGrafNodes] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [visible, setIsVisible] = useState(false);
  const [region, setRegion] = useState({
    latitude: -6.5811218,
    longitude: 110.6872181,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    if (pressGraphId) {
      const selectedGraph = dataGraf?.find(item => item.id === pressGraphId)
      console.log("selectedGraph", selectedGraph);
      setCurrentGrafNodes({ startNodeId: selectedGraph.startNodeId, finalNodeId: selectedGraph.finalNodeId })
    }
  }, [pressGraphId]);

  useEffect(() => {
    setLoading(true)
    const subscriber = firestore().collection('node').onSnapshot(querySnapshot => {
      const node = [];
      querySnapshot.forEach(docSnapshot => {
        node.push({
          id: docSnapshot.id,
          ...docSnapshot.data()
        })
      });
      console.log("fetch snapshot node");
      setDataNode(node)
      setFilteredObjekWisata(node)
      setFilteredNode(node)
    })
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
      setFilteredGraph(graf)
      setLoading(false)
    })

    return () => {
      subscriber()
      subscribeGraf()
    };
  }, []);

  useEffect(() => {
    const filteredPolylines = [];
    const polylineSet = new Set();

    dataGraf?.forEach(poly => {
      const { startNodeId, finalNodeId, polyline, jarak, region, id } = poly;
      const pair1 = `${startNodeId}-${finalNodeId}-${jarak}`;
      const pair2 = `${finalNodeId}-${startNodeId}-${jarak}`;
      if (!polylineSet.has(pair1) && !polylineSet.has(pair2)) {
        filteredPolylines.push({ startNodeId, finalNodeId, polyline, jarak, region, id });
        polylineSet.add(pair1);
      }
    })
    console.log("filteredPoly", filteredPolylines);
    setFilterReversiblePolyline(filteredPolylines)
  }, [dataGraf]);

  useEffect(() => {
    console.log("press id", pressId);
    console.log("press node id", pressNodeId);
  }, [pressId, pressNodeId]);

  useEffect(() => {
    console.log("loading", loading);
  }, [loading]);

  useEffect(() => {
    if (dataGraf && dataNode) {
      const adjacency = buildGraph(dataNode, dataGraf)
      setAdjacencyList(adjacency)
    }
  }, [dataGraf]);

  const bottomSheetRef = useRef(null)
  const bottomSheetItemRef = useRef(null)
  const bottomSheetRouteRef = useRef(null)
  const bottomSheetGrafRef = useRef(null)
  const nodeMarkerRef = useRef(null)


  const snapPoints = useMemo(() => ["20%", "30%", "40%", "50%", '60%', "75%"], []);
  const snapPointsRoute = useMemo(() => ["20%", "30%", "40%", "50%"], []);
  const snapPointsItem = useMemo(() => ["25%", "50%", "75"], []);

  const handleSheetChanges = useCallback((index) => {
    console.log('handleSheetChanges', index);
  }, []);
  const handleSnapPress = useCallback((index) => {
    bottomSheetRef.current?.snapToIndex(index);
  }, []);
  const handleClosePress = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);
  const handleSnapItemPress = useCallback((index) => {
    bottomSheetItemRef.current?.snapToIndex(index);
  }, []);
  const handleCloseItemPress = useCallback(() => {
    bottomSheetItemRef.current?.close();
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

  const dayFinder = useCallback((index) => {
    switch (index) {
      case 0:
        return 'Senin'
      case 1:
        return 'Selasa'
      case 2:
        return 'Rabu'
      case 3:
        return 'Kamis'
      case 4:
        return 'Jumat'
      case 5:
        return 'Sabtu'
      case 6:
        return 'Minggu'
      default:
        break;
    }
  }, [])

  const _map = useRef();
  useEffect(() => {
    if (_map.current) {
      // list of _id's must same that has been provided to the identifier props of the Marker
      _map.current.fitToSuppliedMarkers(dataNode?.map(({ item }) => item?.id));
    }
  }, [dataNode]);

  return (
    <View style={styles.container}>
      <Pressable
        style={{
          position: 'absolute',
          right: '0%',
          zIndex: 1,
          padding: 10
        }}
        onPress={() => {
          auth().signOut().then(() => {
            ToastAndroid.show('Berhasil logout', ToastAndroid.SHORT)
          })
        }}
      >
        <Ionicons
          name={"exit-outline"}
          style={{ color: colors.red, fontSize: 37 }}
        />
      </Pressable>
      <MapView
        ref={_map}
        style={styles.map}
        region={region}
        onPress={() => {
          if (!dijkstraPoly) {
            setPressNodeId(null)
          } else {
            setPressGraphId(null)
          }
          if (!chooseMode) {
            setPressid(null)
            setPressGraphId(null)
            handleSnapPress(0)
          }
        }}
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
        {dataNode?.map(item => (
          item?.tipe == 2 ?
            <Marker
              ref={nodeMarkerRef}
              identifier={item?.id}
              key={item?.id}
              coordinate={({
                latitude: item?.latitude,
                longitude: item?.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              })}
              tracksViewChanges={false}
              onPress={() => {
                if (!dijkstraPoly) {
                  setPressNodeId(item?.id)
                }
                _map.current?.animateToRegion({
                  latitude: item?.latitude,
                  longitude: item?.longitude,
                  latitudeDelta: 0.002,
                  longitudeDelta: 0.002,
                }, 1000)
                if (!chooseMode) {
                  setPressid(null)
                }
              }}
            >
              <View style={{
                width: 100,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {pressGraphId ? (
                  currentGrafNodes?.startNodeId === item?.id ?
                    <>
                      <Text style={{
                        color: colors.black,
                        fontWeight: '900',
                        fontSize: 10,
                        textAlign: 'center'
                      }}>{item.nama}</Text>
                      <NodeMarker
                        color={colors.green}
                      />
                    </>
                    : currentGrafNodes?.finalNodeId === item?.id ?
                      <>
                        <Text style={{
                          color: colors.black,
                          fontWeight: '900',
                          fontSize: 10,
                          textAlign: 'center'
                        }}>{item.nama}</Text>
                        <NodeMarker
                          color={colors.purple}
                        />
                      </> :
                      <>
                        {pressNodeId === item?.id && (
                          <Text style={{
                            color: colors.black,
                            fontWeight: '900',
                            fontSize: 10,
                            textAlign: 'center'
                          }}>{item.nama}</Text>
                        )}
                        <NodeMarker
                          color={colors.black}
                        />
                      </>
                ) : (
                  <>
                    {pressNodeId === item?.id && (
                      <Text style={{
                        color: colors.black,
                        fontWeight: '900',
                        fontSize: 10,
                        textAlign: 'center'
                      }}>{item.nama}</Text>
                    )}
                    <NodeMarker
                      color={(chooseMode || pressNodeId) ? pressNodeId === item?.id ? colors.green : colors.black : colors.black}
                    />
                  </>
                )}
              </View>
            </Marker>
            :
            <Marker.Animated
              key={item?.id}
              identifier={item?.id}
              coordinate={({
                latitude: item?.latitude,
                longitude: item?.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              })}
              onPress={() => {
                // setRegion({
                //   latitude: item?.latitude,
                //   longitude: item?.longitude,
                //   latitudeDelta: 0.002,
                //   longitudeDelta: 0.002,
                // })
                _map.current?.animateToRegion({
                  latitude: item?.latitude,
                  longitude: item?.longitude,
                  latitudeDelta: 0.002,
                  longitudeDelta: 0.002,
                }, 1000)
                // handleClosePress();
                // handleSnapItemPress(0)
                if (chooseMode) {
                  if (pressId !== item?.id && !dijkstraPoly) {
                    setPressNodeId(item?.id)
                  }
                } else {
                  setPressid(item?.id)
                  setPressNodeId(null)
                }
              }}
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
                }}>{item.nama}</Text>
                <CustomMarker
                  color={(chooseMode || pressNodeId || pressId) ? pressNodeId === item?.id ? colors.green : pressId === item?.id && colors.purple : colors.darkBlue}
                />
              </View>
            </Marker.Animated>

        ))}
        {filterReversiblePolyline?.map(item => (
          <Polyline
            key={item?.id}
            coordinates={item?.polyline}
            strokeWidth={3}
            strokeColor={pressGraphId === item?.id ? colors.yellow : colors.darkBlue}
          />
        ))}
        {dijkstraPoly && (
          dijkstraPoly?.edges?.map(edgeId => (
            <Polyline
              key={edgeId}
              coordinates={dataGraf?.find(item => item.id === edgeId)?.polyline}
              strokeWidth={3}
              strokeColor={pressGraphId === edgeId ? colors.yellow : colors.red}
            />
          ))
        )}
        {(pressGraphId && !chooseMode) && (
          <Polyline
            key={dataGraf?.find(item => item?.id === pressGraphId)?.id}
            coordinates={dataGraf?.find(item => item?.id === pressGraphId)?.polyline}
            strokeWidth={3}
            strokeColor={colors.yellow}
          />
        )}
      </MapView>
      <Spinner
        visible={loading}
        textContent="Loading..."
      />
      {(chooseMode && !dijkstraPoly) && (
        <>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            margin: 10,
            backgroundColor: colors.green,
            padding: 7,
            borderRadius: 10,
          }}>
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
              {pressNodeId ? dataNode?.find(item => item?.id === pressNodeId).nama : "Pilih Titik Berangkat"}
            </Text>
          </View>
          <View
            style={{
              alignSelf: 'center',
              position: 'absolute',
              bottom: '10%',
              width: SCREEN_WIDTH * 0.90,
              justifyContent: 'space-around'
            }}
          >
            {pressNodeId && (
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
                  const dijkstraResult = dijkstra(adjacencyList, pressNodeId, pressId)
                  setDijkstraPoly(dijkstraResult)
                  _map.current?.animateToRegion(calculateGrafRegion(dataNode?.find(item => item?.id === pressNodeId), dataNode?.find(item => item?.id === pressId)), 1000)
                }}
              >
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 15,
                    fontWeight: '700'
                  }}
                >
                  Pilih Titik Ini
                </Text>
              </TouchableOpacity>
            )}
            <View
              style={{
                height: 15
              }}
            >

            </View>
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
              }}
              onPress={() => {
                setChooseMode(false)
                handleSnapItemPress(1)
                setPressNodeId(null)
                setDijkstraPoly(null)
                _map.current?.animateToRegion({
                  latitude: dataNode?.find(item => item?.id === pressId)?.latitude,
                  longitude: dataNode?.find(item => item?.id === pressId)?.longitude,
                  latitudeDelta: 0.003,
                  longitudeDelta: 0.003
                }, 1000)
              }}
            >
              <Text
                style={{
                  color: colors.white,
                  fontSize: 15,
                  fontWeight: '700'
                }}
              >
                Kembali
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      {(pressGraphId && !chooseMode) && (
        <BottomSheet
          ref={bottomSheetGrafRef}
          onChange={handleSheetChanges}
          enableDynamicSizing={true}
          style={styles.contentContainer}
          enablePanDownToClose={true}
          onClose={() => {
            setPressGraphId(null)
            setCurrentGrafNodes(null)
            bottomSheetGrafRef.current?.snapToIndex(0)
            handleSnapPress(0)
          }}
          index={0}
        >
          <BottomSheetScrollView
            contentContainerStyle={{
              paddingBottom: 25
            }}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: "space-between",
              marginBottom: 10
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
                  {dataNode?.find(item => item?.id === currentGrafNodes?.startNodeId)?.nama}
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
                  style={{ color: colors.red, fontSize: 30 }}
                />
                <Text
                  style={{
                    color: colors.red,
                    fontWeight: 'bold'
                  }}
                >
                  {dataGraf?.find(item => item.id === pressGraphId)?.jarak} m
                </Text>
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
                  {dataNode?.find(item => item?.id === currentGrafNodes?.finalNodeId)?.nama}
                </Text>
              </View>
            </View>
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
                setLoading(true)
                firestore().collection('graf').doc(pressGraphId).delete().then(() => {
                  ToastAndroid.show('Berhasil hapus graf', ToastAndroid.SHORT)
                  setPressGraphId(null)
                  setCurrentGrafNodes(null)
                  bottomSheetGrafRef.current?.snapToIndex(0)
                  handleSnapPress(0)
                }).catch(() => {
                  ToastAndroid.show('Aksi gagal dilakukan', ToastAndroid.SHORT)
                }).finally(() => {
                  setLoading(false)
                })
              }}
            >
              <View
                style={{
                  flexDirection: 'row'
                }}
              >
                <Ionicons
                  name='trash-sharp'
                  style={{
                    fontSize: 20,
                    color: colors.white,
                  }}
                />
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Hapus Graf
                </Text>
              </View>
            </TouchableOpacity>
          </BottomSheetScrollView>
        </BottomSheet>
      )}
      {dijkstraPoly && (
        <BottomSheet
          ref={bottomSheetRouteRef}
          onChange={handleSheetChanges}
          snapPoints={snapPointsRoute}
          enableDynamicSizing={true}
          style={styles.contentContainer}
          index={0}
        >
          <BottomSheetScrollView
            contentContainerStyle={{
              paddingBottom: 25
            }}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: "space-between",
              marginBottom: 10
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
                  {dataNode?.find(item => item?.id === pressNodeId)?.nama}
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
                  style={{ color: colors.red, fontSize: 30 }}
                />
                <Text
                  style={{
                    color: colors.red,
                    fontWeight: 'bold'
                  }}
                >
                  {dijkstraPoly?.distance} m
                </Text>
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
                  {dataNode?.find(item => item?.id === pressId)?.nama}
                </Text>
              </View>
            </View>
            <View
              style={{
                marginBottom: 15
              }}
            >
              {dijkstraPoly?.edges?.map(item => (
                <TouchableOpacity
                  key={item}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 2,
                    borderColor: 'rgba(196, 196, 196, 0.5)',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    alignContent: 'flex-end'
                  }}
                  onPress={() => {
                    setPressGraphId(item)
                    const graphRegion = dataGraf?.find(i => i?.id === item)?.region
                    _map.current?.animateToRegion(graphRegion, 1000)
                    bottomSheetRouteRef.current?.snapToIndex(0)
                  }}
                >
                  <Text
                    style={{
                      color: colors.black,
                      fontWeight: 'bold',
                      fontSize: 14,
                      flex: 1
                    }}
                  >
                    {dataNode?.find(i => i?.id === dataGraf?.find(i => i?.id === item)?.startNodeId)?.nama} - {dataNode?.find(i => i?.id === dataGraf?.find(i => i?.id === item)?.finalNodeId)?.nama}
                  </Text>
                  <Text
                    style={{
                      color: colors.black,
                      fontWeight: 'bold',
                      fontSize: 14,
                      // flex: 1
                    }}
                  >
                    {dataGraf?.find(i => i?.id === item)?.jarak} m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
                marginVertical: 10
              }}
              onPress={() => {
                setChooseMode(false)
                handleSnapItemPress(1)
                setPressNodeId(null)
                setDijkstraPoly(null)
                setPressGraphId(null)
                _map.current?.animateToRegion({
                  latitude: dataNode?.find(item => item?.id === pressId)?.latitude,
                  longitude: dataNode?.find(item => item?.id === pressId)?.longitude,
                  latitudeDelta: 0.003,
                  longitudeDelta: 0.003
                }, 1000)
              }}
            >
              <Text
                style={{
                  color: colors.white,
                  fontSize: 15,
                  fontWeight: '700',
                }}
              >
                Kembali
              </Text>
            </TouchableOpacity>
          </BottomSheetScrollView>
        </BottomSheet>
      )}
      {pressId ? (
        <BottomSheet
          ref={bottomSheetItemRef}
          onChange={handleSheetChanges}
          index={0}
          snapPoints={snapPointsItem}
          style={styles.contentContainer}
          enablePanDownToClose={true}
          onClose={() => {
            if (!chooseMode) {
              setPressid(null)
              handleSnapPress(0)
            }
          }}
        >
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: "space-between"
            }}>
              <View>
                <Text style={{
                  fontWeight: '900',
                  color: colors.black,
                  fontSize: 20,
                  marginBottom: 4
                }}>
                  {pressId ? dataNode?.find(item => item?.id === pressId).nama : "Ini nama objek wisata"}
                </Text>
                <Text
                  style={{
                    color: colors.black,
                    fontSize: 15,
                  }}
                >
                  {dataNode?.find(item => item?.id === pressId)?.alamat ? dataNode?.find(item => item?.id === pressId).alamat : "Belum ada alamat"}
                </Text>
              </View>
              <Ionicons
                name={"close-circle-outline"}
                style={{ color: colors.darkGrey, fontSize: 40 }}
                onPress={() => {
                  setPressid(null)
                }}
              />
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
                marginTop: 10
              }}
              onPress={() => {
                setChooseMode(true)
                handleCloseItemPress();
              }}
            >
              <View
                style={{
                  flexDirection: 'row'
                }}
              >
                <FontAwesome5
                  name={"directions"}
                  size={20}
                  color={colors.white}
                />
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  {'\t'}Cari Rute
                </Text>
              </View>
            </TouchableOpacity>
            {(dataNode?.find(item => item?.id === pressId)?.foto && dataNode?.find(item => item?.id === pressId)?.foto.length !== 0) && (
              <>
                <ImageView
                  images={dataNode?.find(item => item?.id === pressId)?.foto}
                  imageIndex={currentImageIndex}
                  visible={visible}
                  onRequestClose={() => setIsVisible(false)}
                  FooterComponent={({ imageIndex }) => (
                    <View style={{
                      height: 64,
                      backgroundColor: "#00000077",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Text style={{
                        fontSize: 17,
                        color: "#FFF"
                      }}>
                        {`${imageIndex + 1} / ${dataNode?.find(item => item?.id === pressId)?.foto?.length}`}
                      </Text>
                    </View>
                  )}
                />
                <ScrollView
                  style={{
                    marginVertical: 20,
                  }}
                  horizontal={true}
                >
                  {dataNode?.find(item => item?.id === pressId)?.foto?.map((item, index) => (
                    <Pressable
                      key={item.uri}
                      style={{ marginRight: 5 }}
                      onPress={() => {
                        setIsVisible(true)
                        setCurrentImageIndex(index)
                      }}
                    >
                      <Image
                        source={{
                          uri: item?.uri,
                        }}
                        style={{ width: 250, height: 250 }}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
            {dataNode?.find(item => item?.id === pressId)?.deskripsi && (
              <View style={{ marginVertical: 20 }}>
                <Text style={{ color: colors.black, fontSize: 16, fontWeight: '700', marginBottom: 7 }}>Deskripsi</Text>
                <Text style={{ color: colors.black, fontSize: 16 }}>{dataNode?.find(item => item?.id === pressId)?.deskripsi}</Text>
              </View>
            )}
            {(dataNode?.find(item => item?.id === pressId)?.jamBuka && !dataNode?.find(item => item?.id === pressId)?.jamBuka?.every(item => item?.buka === "" && item?.tutup === "")) && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: colors.black, fontSize: 16, fontWeight: '700', marginBottom: 7 }}>Waktu Buka</Text>
                {dataNode?.find(item => item?.id === pressId)?.jamBuka?.map((item, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      flex: 1,
                      alignItems: 'center',
                      marginBottom: 7,
                      borderBottomWidth: 2,
                      borderColor: 'rgba(196, 196, 196, 0.5)',
                      paddingBottom: 7
                    }}
                  >
                    {(item?.buka !== '' && item?.tutup !== '') ? (
                      <>
                        <Text
                          style={{
                            color: colors.black,
                            fontSize: 16,
                            flex: 1
                          }}
                        >
                          {dayFinder(index)}
                        </Text>
                        <Text
                          style={{
                            color: colors.black,
                            fontSize: 16,
                            flex: 1
                          }}
                        >
                          {item?.buka} - {item?.tutup}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text
                          style={{
                            color: colors.red,
                            fontSize: 16,
                            flex: 1
                          }}
                        >
                          {dayFinder(index)}
                        </Text>
                        <Text
                          style={{
                            color: colors.red,
                            fontSize: 16,
                            flex: 1
                          }}
                        >
                          Tutup
                        </Text>
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}
            {dataNode?.find(item => item?.id === pressId)?.htm && !dataNode?.find(item => item?.id === pressId)?.htm?.every(item => item?.anak === "" && item?.dewasa === "") && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: colors.black, fontSize: 16, fontWeight: '700', marginBottom: 7 }}>Harga Tiket Masuk</Text>
                {dataNode?.find(item => item?.id === pressId)?.htm?.map((item, index) => (
                  (item.anak !== "" && item.dewasa !== "") &&
                  <View key={index} style={{ flexDirection: 'row', marginBottom: 7, borderBottomWidth: 2, borderColor: 'rgba(196, 196, 196, 0.5)', paddingBottom: 7 }}>
                    <Text
                      style={{
                        color: colors.black,
                        fontSize: 16,
                        flex: 1
                      }}
                    >
                      {dayFinder(index)}
                    </Text>
                    <View style={{ flex: 1 }}>
                      {item?.dewasa === item?.anak ? (
                        <Text
                          style={{
                            color: colors.black,
                            fontSize: 16,
                          }}
                        >
                          Rp {formatIDR.format(item?.dewasa).replace('IDR', '').trim()}
                        </Text>
                      ) : (
                        <>
                          <Text
                            style={{
                              color: colors.black,
                              fontSize: 16,
                            }}
                          >
                            Rp {formatIDR.format(item?.dewasa).replace('IDR', '').trim()} (Dewasa)
                          </Text>
                          <Text
                            style={{
                              color: colors.black,
                              fontSize: 16,
                            }}
                          >
                            Rp {formatIDR.format(item?.anak).replace('IDR', '').trim()} (Anak-anak)
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </BottomSheetScrollView>
        </BottomSheet>
      ) : (
        <BottomSheet
          ref={bottomSheetRef}
          onChange={handleSheetChanges}
          index={0}
          snapPoints={snapPoints}
          style={styles.contentContainer}
        >
          <Navigator
            dataNode={dataNode}
            handleCloseItemPress={handleCloseItemPress}
            handleClosePress={handleClosePress}
            handleSnapItemPress={handleSnapItemPress}
            handleSnapPress={handleSnapPress}
            setPressid={setPressid}
            setPressNodeId={setPressNodeId}
            setRegion={setRegion}
            nodeMarkerRef={nodeMarkerRef}
            navigation={navigation}
            dataGraf={dataGraf}
            setSearchObjek={setSearchObjek}
            setFilteredObjekWisata={setFilteredObjekWisata}
            setFilteredNode={setFilteredNode}
            setFilteredGraph={setFilteredGraph}
            filteredObjekWisata={filteredObjekWisata}
            filteredNode={filteredNode}
            filteredGraph={filteredGraph}
            searchObjek={searchObjek}
            setLoading={setLoading}
            _map={_map}
            setPressGraphId={setPressGraphId}
            bottomSheetRef={bottomSheetRef}
            loading={loading}
          />
        </BottomSheet>
      )}
    </View>
  )
}


function ObjekWisataScreen({ data, setRegion, handleClosePress, handleSnapItemPress, setPressid, setSearchObjek, setFilteredObjekWisata, searchObjek, filteredObjekWisata, setLoading, navigation, _map, bottomSheetRef, loading }) {
  const [isModalVisible, setModalVisible] = useState(false);
  const [id, setId] = useState("");
  return (
    <View style={{ backgroundColor: colors.white, flex: 1 }}>
      <ModalLongPress
        isVisible={isModalVisible}
        setIsVisible={setModalVisible}
        data={id !== "" && data?.find((i => i?.id === id))}
        setLoading={setLoading}
        navigation={navigation}
      />
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white
      }}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={{
              borderRadius: 10,
              paddingLeft: 15,
              paddingRight: 40,
              paddingVertical: 10,
              color: colors.black,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.darkGrey,

            }}
            placeholder="Cari Objek Wisata"
            placeholderTextColor={colors.darkGrey}
            onChangeText={value => {
              setSearchObjek(value)
              const dataObjek = data?.filter(item => item?.tipe === 1)
              const filterData = dataObjek?.filter(item => item?.nama?.toLowerCase().includes(value.toLowerCase()))
              setFilteredObjekWisata(filterData)
            }}
            value={searchObjek}
          />
          <Ionicons name={'search-sharp'}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              fontSize: 20,
              padding: 14,
              color: colors.darkGrey,
            }}
          />
        </View>
      </View>
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 20, backgroundColor: colors.white }}>
        {filteredObjekWisata?.map(item => (
          item?.tipe == 1 &&
          <Pressable
            key={item?.id}
            onPress={() => {
              // setRegion({
              //   latitude: item?.latitude,
              //   longitude: item?.longitude,
              //   latitudeDelta: 0.002,
              //   longitudeDelta: 0.002,
              // });
              _map.current?.animateToRegion({
                latitude: item?.latitude,
                longitude: item?.longitude,
                latitudeDelta: 0.002,
                longitudeDelta: 0.002,
              }, 1000)
              // handleClosePress();
              // handleSnapItemPress(0);
              setPressid(item?.id)
              bottomSheetRef.current?.snapToIndex(0)
            }}
            onLongPress={() => {
              setModalVisible(true)
              setId(item?.id)
            }}
          >
            <View style={styles.itemContainer}>
              {item?.foto && item?.foto?.length !== 0 ? (
                <Image
                  source={{
                    uri: item?.foto[0]?.uri,
                  }}
                  style={{ width: 50, height: 50, marginRight: 6 }}
                />
              ) : (
                <Image
                  source={{
                    uri: "https://www.its.ac.id/tmesin/wp-content/uploads/sites/22/2022/07/no-image.png",
                  }}
                  style={{ width: 50, height: 50, marginRight: 6 }}
                />
              )}
              <View style={{
                justifyContent: 'center'
              }}>
                <Text style={styles.textJudul}>{item?.nama}</Text>
                <Text style={{
                  fontSize: 13,
                  color: colors.black,
                }}>{item?.alamat ? item?.alamat : "Belum ada alamat"}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </BottomSheetScrollView>
    </View>
  );
}

function NodeScreen({ data, setRegion, setPressid, handleSnapPress, nodeMarkerRef, setPressNodeId, _map, setFilteredNode, filteredNode, loading, setLoading, navigation }) {
  const [searchNode, setSearchNode] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [id, setId] = useState("");
  return (
    <View style={{ backgroundColor: colors.white, flex: 1 }}>
      <ModalNodeLongPress
        isVisible={isModalVisible}
        setIsVisible={setModalVisible}
        data={id !== "" && data?.find((i => i?.id === id))}
        setLoading={setLoading}
        navigation={navigation}
        dataAllNodes={data}
      />
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white
      }}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={{
              borderRadius: 10,
              paddingLeft: 15,
              paddingRight: 40,
              paddingVertical: 10,
              color: colors.black,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.darkGrey,

            }}
            placeholder="Cari Node"
            placeholderTextColor={colors.darkGrey}
            onChangeText={value => {
              setSearchNode(value)
              const dataObjek = data?.filter(item => item?.tipe === 2)
              const filterData = dataObjek?.filter(item => item?.nama?.toLowerCase().includes(value.toLowerCase()))
              setFilteredNode(filterData)
            }}
            value={searchNode}
          />
          <Ionicons name={'search-sharp'}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              fontSize: 20,
              padding: 14,
              color: colors.darkGrey,
            }}
          />
        </View>
      </View>
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 20, backgroundColor: colors.white }}>
        {filteredNode?.map(item => (
          item?.tipe == 2 &&
          <Pressable
            key={item?.id}
            onPress={() => {
              // setRegion({
              //   latitude: item?.latitude,
              //   longitude: item?.longitude,
              //   latitudeDelta: 0.002,
              //   longitudeDelta: 0.002,
              // });
              _map.current?.animateToRegion({
                latitude: item?.latitude,
                longitude: item?.longitude,
                latitudeDelta: 0.002,
                longitudeDelta: 0.002,
              }, 1000)
              handleSnapPress(0);
              setPressNodeId(item?.id);
            }}
            onLongPress={() => {
              setModalVisible(true)
              setId(item?.id)
            }}
          >
            <View style={styles.itemContainer}>
              <View style={{
                justifyContent: 'center'
              }}>
                <Text style={styles.textJudul}>{item?.nama}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </BottomSheetScrollView>
    </View>
  );
}

function GrafScreen({ data, setRegion, dataNode, handleSnapPress, _map, setPressGraphId, bottomSheetRef, filteredGraph, setFilteredGraph, loading }) {
  const [searchGraph, setSearchGraph] = useState('');
  return (
    <View style={{ backgroundColor: colors.white, flex: 1 }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white
      }}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={{
              borderRadius: 10,
              paddingLeft: 15,
              paddingRight: 40,
              paddingVertical: 10,
              color: colors.black,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.darkGrey,

            }}
            placeholder="Cari Graf"
            placeholderTextColor={colors.darkGrey}
            onChangeText={value => {
              setSearchGraph(value)
              const filterData = data?.filter(item => dataNode?.find(i => i?.id === item?.startNodeId)?.nama?.toLowerCase().includes(value.toLowerCase()) || dataNode?.find(i => i?.id === item?.finalNodeId)?.nama.toLowerCase().includes(value.toLowerCase()))
              setFilteredGraph(filterData)
            }}
            value={searchGraph}
          />
          <Ionicons name={'search-sharp'}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              fontSize: 20,
              padding: 14,
              color: colors.darkGrey,
            }}
          />
        </View>
      </View>
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 20, backgroundColor: colors.white }}>
        {filteredGraph?.map(item => (
          <Pressable
            key={item?.id}
            onPress={() => {
              // setRegion({
              //   latitude: item?.region?.latitude,
              //   longitude: item?.region?.longitude,
              //   latitudeDelta: item?.region?.latitudeDelta,
              //   longitudeDelta: item?.region?.longitudeDelta,
              // });
              _map.current?.animateToRegion({
                latitude: item?.region?.latitude,
                longitude: item?.region?.longitude,
                latitudeDelta: item?.region?.latitudeDelta,
                longitudeDelta: item?.region?.longitudeDelta,
              }, 1000)
              bottomSheetRef?.current?.close();
              setPressGraphId(item?.id)
            }}
          >
            <View style={styles.itemContainer}>
              <View style={{
                justifyContent: 'center'
              }}>
                <Text style={styles.textJudul}>{dataNode?.find(i => i?.id === item?.startNodeId)?.nama} - {dataNode?.find(i => i?.id === item?.finalNodeId)?.nama}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </BottomSheetScrollView>
    </View>
  );
}

const Tab = createBottomTabNavigator();
const Navigator = ({ dataNode, dataGraf, handleSnapPress, handleClosePress, handleSnapItemPress, handleCloseItemPress, setPressid, setRegion, nodeMarkerRef, navigation, setPressNodeId, setSearchObjek, setFilteredObjekWisata, searchObjek, filteredObjekWisata, setLoading, _map, setPressGraphId, bottomSheetRef, setFilteredNode, filteredNode, filteredGraph, setFilteredGraph, loading }) => {
  return (
    <NavigationContainer independent={true}>
      <Tab.Navigator
        screenOptions={{
          safeAreaInsets: { top: 0 },
          cardStyle: {
            backgroundColor: colors.white,
            overflow: 'visible',
          },
        }}
      >
        <Tab.Screen
          name="Objek Wisata"
          options={{
            headerTitle: "Daftar Objek Wisata",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={'location-sharp'} color={color} size={size} />
            ),
            headerRight: () => (
              <HeaderAddButton
                onPress={() => {
                  navigation.navigate('AddObjekWisata')
                }}
              />
            )
          }}
        >
          {(props) => <ObjekWisataScreen data={dataNode} setRegion={setRegion} handleClosePress={handleClosePress} handleSnapItemPress={handleSnapItemPress} setPressid={setPressid} setSearchObjek={setSearchObjek} setFilteredObjekWisata={setFilteredObjekWisata} searchObjek={searchObjek} filteredObjekWisata={filteredObjekWisata} setLoading={setLoading} navigation={navigation} _map={_map} bottomSheetRef={bottomSheetRef} loading={loading} />}
        </Tab.Screen>
        <Tab.Screen
          name="Node"
          options={{
            headerTitle: "Daftar Node",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={'ellipse-sharp'} color={color} size={size} />
            ),
            headerRight: () => (
              <HeaderAddButton
                onPress={() => {
                  navigation.navigate('AddNode', {
                    dataNode
                  })
                }}
              />
            )
          }}
        >
          {(props) => <NodeScreen data={dataNode} setRegion={setRegion} setPressid={setPressid} handleSnapPress={handleSnapPress} nodeMarkerRef={nodeMarkerRef} setPressNodeId={setPressNodeId} _map={_map} setFilteredNode={setFilteredNode} filteredNode={filteredNode} loading={loading} setLoading={setLoading} navigation={navigation} />}
        </Tab.Screen>
        <Tab.Screen
          name="Graf"
          options={{
            headerTitle: "Daftar Graf",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={'analytics-outline'} color={color} size={size} />
            ),
            headerRight: () => (
              <HeaderAddButton
                onPress={() => {
                  navigation.navigate('AddGraf', {
                    dataNode,
                    dataGraf
                  })
                }}
              />
            )
          }}
        >
          {(props) => <GrafScreen data={dataGraf} dataNode={dataNode} setRegion={setRegion} handleSnapPress={handleSnapPress} _map={_map} setPressGraphId={setPressGraphId} bottomSheetRef={bottomSheetRef} filteredGraph={filteredGraph} setFilteredGraph={setFilteredGraph} loading={loading} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  )
}

function ModalNodeLongPress({ isVisible, data, setIsVisible, setLoading, navigation, dataAllNodes }) {
  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={0.4}
      onBackButtonPress={() => setIsVisible(false)}
      onBackdropPress={() => setIsVisible(false)}
      useNativeDriver={true}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: 10,
            width: '90%',
            paddingHorizontal: 20,
            paddingVertical: 15,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text style={{ color: colors.black, fontSize: 20, fontWeight: '700', marginBottom: 10 }}>Aksi {data?.nama}</Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.yellow,
              borderRadius: 15,
              alignItems: 'center',
              paddingVertical: 10,
              flexDirection: 'row',
              justifyContent: "center",
              marginVertical: 15,
            }}
            onPress={() => {
              navigation.navigate('EditNode', {
                data,
                dataAllNodes
              })
              setIsVisible(false)
            }}
          >
            <Ionicons
              name='pencil-sharp'
              style={{
                fontSize: 20,
                color: colors.white,
              }}
            />
            <Text
              style={{
                color: colors.white,
                fontSize: 15,
                fontWeight: '700'
              }}
            >
              {" "}Edit Node
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: colors.red,
              borderRadius: 15,
              alignItems: 'center',
              paddingVertical: 10,
              flexDirection: 'row',
              justifyContent: "center",
              marginBottom: 10,
            }}
            onPress={() => {
              setLoading(true)
              firestore().collection('node').doc(data?.id).delete().then(() => {
                ToastAndroid.show('Berhasil hapus node', ToastAndroid.SHORT)
              }).catch(() => {
                ToastAndroid.show('Aksi gagal dilakukan', ToastAndroid.SHORT)
              }).finally(() => {
                setIsVisible(false)
                setLoading(false)
              })
            }}
          >
            <Ionicons
              name='trash-sharp'
              style={{
                fontSize: 20,
                color: colors.white,
              }}
            />
            <Text
              style={{
                color: colors.white,
                fontSize: 15,
                fontWeight: '700'
              }}
            >
              {" "}Hapus Node
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

function ModalLongPress({ isVisible, data, setIsVisible, setLoading, navigation }) {
  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={0.4}
      onBackButtonPress={() => setIsVisible(false)}
      onBackdropPress={() => setIsVisible(false)}
      useNativeDriver={true}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: 10,
            width: '90%',
            paddingHorizontal: 20,
            paddingVertical: 15,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text style={{ color: colors.black, fontSize: 20, fontWeight: '700', marginBottom: 10 }}>Aksi {data?.nama}</Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.yellow,
              borderRadius: 15,
              alignItems: 'center',
              paddingVertical: 10,
              flexDirection: 'row',
              justifyContent: "center",
              marginVertical: 15,
            }}
            onPress={() => {
              navigation.navigate('EditObjekWisata', {
                data
              })
              setIsVisible(false)
            }}
          >
            <Ionicons
              name='pencil-sharp'
              style={{
                fontSize: 20,
                color: colors.white,
              }}
            />
            <Text
              style={{
                color: colors.white,
                fontSize: 15,
                fontWeight: '700'
              }}
            >
              {" "}Edit Objek Wisata
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: colors.red,
              borderRadius: 15,
              alignItems: 'center',
              paddingVertical: 10,
              flexDirection: 'row',
              justifyContent: "center",
              marginBottom: 10,
            }}
            onPress={async () => {
              setLoading(true)
              try {
                const deletePromises = data?.foto.map(image => {
                  const imageRef = storage().refFromURL(image.uri);
                  return imageRef.delete();
                });
                await Promise.all(deletePromises)
                await firestore().collection('node').doc(data?.id).delete().then(() => {
                  ToastAndroid.show('Berhasil hapus objek wisata', ToastAndroid.SHORT)
                }).catch(() => {
                  ToastAndroid.show('Aksi gagal dilakukan', ToastAndroid.SHORT)
                })
              } catch (error) {
                ToastAndroid.show('Aksi gagal dilakukan', ToastAndroid.SHORT)
              } finally {
                setIsVisible(false)
                setLoading(false)
              }
            }}
          >
            <Ionicons
              name='trash-sharp'
              style={{
                fontSize: 20,
                color: colors.white,
              }}
            />
            <Text
              style={{
                color: colors.white,
                fontSize: 15,
                fontWeight: '700'
              }}
            >
              {" "}Hapus Objek Wisata
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const HeaderAddButton = ({ onPress }) => {
  return (
    <Pressable
      onPress={onPress}
    >
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.darkBlue,
          padding: 7,
          borderRadius: 10
        }}
      >
        <Text
          style={{
            color: colors.darkBlue,
            fontSize: 17,
            fontWeight: '800'
          }}
        >
          Tambah
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    // height: SCREEN_HEIGHT,
    // width: SCREEN_WIDTH,
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  textJudul: {
    color: colors.black,
    fontWeight: 'bold',
    fontSize: 14
  },
  contentContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
    // alignItems: 'center',
    color: colors.white
  },
  itemContainer: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderColor: 'rgba(196, 196, 196, 0.5)',
    flexDirection: 'row'
  },
  footerContainer: {
    padding: 12,
    margin: 12,
    borderRadius: 12,
    backgroundColor: '#80f',
  },
  footerText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: '800',
  },
  input: {
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 10,
    fontSize: 16,
    lineHeight: 20,
    padding: 8,
    backgroundColor: 'rgba(151, 151, 151, 0.25)',
  },
});