import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ToastAndroid, Pressable, Image, Keyboard } from "react-native";
import MapView, { Polyline } from "react-native-maps";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Marker, AnimatedRegion } from "react-native-maps";
import GetLocation from 'react-native-get-location';
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFooter, BottomSheetTextInput, BottomSheetModalProvider, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from "../../utility/colors";
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import firestore from '@react-native-firebase/firestore';
import { FlatList, ScrollView, TextInput } from "react-native-gesture-handler";
import { decode } from "@googlemaps/polyline-codec";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Spinner from "react-native-loading-spinner-overlay";
import ImageView from 'react-native-image-viewing'
import { buildGraph } from "../../utility/buildGraph";
import { dijkstra, yenKShortestPaths } from "../../utility/dijkstra";
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

export default function Home({ route, navigation }) {

  const [pressId, setPressid] = useState(null)
  const [pressNodeId, setPressNodeId] = useState(null)
  const [dataNode, setDataNode] = useState(null)
  const [filteredObjekWisata, setFilteredObjekWisata] = useState(null)
  const [dataGraf, setDataGraf] = useState(null)
  const [loading, setLoading] = useState(false)
  const [chooseMode, setChooseMode] = useState(false)
  const [adjacencyList, setAdjacencyList] = useState(null)
  const [dijkstraPoly, setDijkstraPoly] = useState(null)
  const [mainPoly, setMainPoly] = useState(null)
  const [yenKPoly, setYenKPoly] = useState(null)
  const [jarakAlternatif, setJarakAlternatif] = useState(0)
  const [pressGraphId, setPressGraphId] = useState(null)
  const [currentGrafNodes, setCurrentGrafNodes] = useState(null);
  const [searchInput, setSearchInput] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [visible, setIsVisible] = useState(false);
  const [routeTabIndex, setRouteTabIndex] = useState(0)
  const [region, setRegion] = useState({
    latitude: -6.5811218,
    longitude: 110.6872181,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  const snapPoints = useMemo(() => ["20%", "30%", "40%", "50%", '60%', "75%"], []);
  const snapPointsItem = useMemo(() => ["25%", "50%", "75", "100%"], []);
  const snapPointsRoute = useMemo(() => ["20%", "30%", "40%", "50%", "60%", "70%", "80%"], []);

  useEffect(() => {
    if (dataGraf && dataNode) {
      const adjacency = buildGraph(dataNode, dataGraf)
      setAdjacencyList(adjacency)
    }
  }, [dataGraf]);

  useEffect(() => {
    console.log("press id", pressId);
    console.log("press node id", pressNodeId);
  }, [pressId, pressNodeId]);

  useEffect(() => {
    console.log("dijkstraPoly", dijkstraPoly);
    console.log("yenKPoly", yenKPoly);
  }, [dijkstraPoly, yenKPoly]);

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
      setFilteredObjekWisata(node?.filter(item => item?.tipe === 1))
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
      setLoading(false)
    })

    return () => {
      subscriber()
      subscribeGraf()
    };
  }, []);

  useEffect(() => {
    console.log("press id", pressId);
    console.log("press node id", pressNodeId);
  }, [pressId, pressNodeId]);

  const _map = useRef();
  const bottomSheetRef = useRef(null)
  const bottomSheetItemRef = useRef(null)
  const bottomSheetRouteRef = useRef(null)

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

  const countAltDistance = useCallback((edges) => {
    let total = 0;
    edges?.map(item => {
      total = total + dataGraf?.find(i => i.id === item)?.jarak
    })
    console.log("total", total);
    return total
  })

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

  return (
    <View style={styles.container}>
      <Pressable
        style={{
          position: 'absolute',
          right: '0%',
          zIndex: 1
        }}
        onPress={() => {
          navigation.navigate('Login')
        }}
      >
        <Ionicons
          name={"person"}
          style={{ color: 'rgba(0, 0, 0, 0)', fontSize: 30 }}
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
        {dijkstraPoly ? (
          routeTabIndex === 0 ?
            dijkstraPoly?.path?.map(id => (
              <Marker
                key={id}
                tracksViewChanges={false}
                coordinate={({
                  latitude: dataNode?.find(item => item?.id === id)?.latitude,
                  longitude: dataNode?.find(item => item?.id === id)?.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                })}
              >
                {dataNode?.find(item => item?.id === id)?.tipe === 1 ? (
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
                    }}>{dataNode?.find(item => item?.id === id)?.nama}</Text>
                    <CustomMarker
                      color={(chooseMode || pressNodeId) ? pressNodeId === id ? colors.green : pressId === id ? colors.purple : colors.darkBlue : colors.darkBlue}
                    />
                  </View>
                ) : (
                  pressGraphId ?
                    currentGrafNodes?.startNodeId === id ?
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
                        }}>{dataNode?.find(item => item.id === currentGrafNodes?.startNodeId)?.nama}</Text>
                        <NodeMarker
                          color={colors.green}
                        />
                      </View>
                      : currentGrafNodes?.finalNodeId === id ?
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
                          }}>{dataNode?.find(item => item.id === currentGrafNodes?.finalNodeId)?.nama}</Text>
                          <NodeMarker
                            color={colors.purple}
                          />
                        </View>
                        :
                        <NodeMarker
                          color={colors.black}
                        /> :
                    id === pressNodeId ?
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
                        }}>{dataNode?.find(item => item.id === pressNodeId)?.nama}</Text>
                        <NodeMarker
                          color={(chooseMode && pressNodeId) ? pressNodeId === id ? colors.green : colors.black : colors.black}
                        />
                      </View>
                      :
                      <NodeMarker
                        color={(chooseMode && pressNodeId) ? pressNodeId === id ? colors.green : colors.black : colors.black}
                      />
                )}
              </Marker>
            )) :
            routeTabIndex === 1 ?
              yenKPoly[1]?.path?.map((id, index) => (
                <Marker
                  key={index}
                  tracksViewChanges={false}
                  coordinate={({
                    latitude: dataNode?.find(item => item?.id === id)?.latitude,
                    longitude: dataNode?.find(item => item?.id === id)?.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  })}
                >
                  {dataNode?.find(item => item?.id === id)?.tipe === 1 ? (
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
                      }}>{dataNode?.find(item => item?.id === id)?.nama}</Text>
                      <CustomMarker
                        color={(chooseMode || pressNodeId) ? pressNodeId === id ? colors.green : pressId === id ? colors.purple : colors.darkBlue : colors.darkBlue}
                      />
                    </View>
                  ) : (
                    pressGraphId ?
                      currentGrafNodes?.startNodeId === id ?
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
                          }}>{dataNode?.find(item => item.id === currentGrafNodes?.startNodeId)?.nama}</Text>
                          <NodeMarker
                            color={colors.green}
                          />
                        </View>
                        : currentGrafNodes?.finalNodeId === id ?
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
                            }}>{dataNode?.find(item => item.id === currentGrafNodes?.finalNodeId)?.nama}</Text>
                            <NodeMarker
                              color={colors.purple}
                            />
                          </View>
                          :
                          <NodeMarker
                            color={colors.black}
                          /> :
                      id === pressNodeId ?
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
                          }}>{dataNode?.find(item => item.id === pressNodeId)?.nama}</Text>
                          <NodeMarker
                            color={(chooseMode && pressNodeId) ? pressNodeId === id ? colors.green : colors.black : colors.black}
                          />
                        </View>
                        :
                        <NodeMarker
                          color={(chooseMode && pressNodeId) ? pressNodeId === id ? colors.green : colors.black : colors.black}
                        />
                  )}
                </Marker>
              )) :
              routeTabIndex === 2 &&
              yenKPoly[2]?.path?.map((id, index) => (
                <Marker
                  key={index}
                  tracksViewChanges={false}
                  coordinate={({
                    latitude: dataNode?.find(item => item?.id === id)?.latitude,
                    longitude: dataNode?.find(item => item?.id === id)?.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  })}
                >
                  {dataNode?.find(item => item?.id === id)?.tipe === 1 ? (
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
                      }}>{dataNode?.find(item => item?.id === id)?.nama}</Text>
                      <CustomMarker
                        color={(chooseMode || pressNodeId) ? pressNodeId === id ? colors.green : pressId === id ? colors.purple : colors.darkBlue : colors.darkBlue}
                      />
                    </View>
                  ) : (
                    pressGraphId ?
                      currentGrafNodes?.startNodeId === id ?
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
                          }}>{dataNode?.find(item => item.id === currentGrafNodes?.startNodeId)?.nama}</Text>
                          <NodeMarker
                            color={colors.green}
                          />
                        </View>
                        : currentGrafNodes?.finalNodeId === id ?
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
                            }}>{dataNode?.find(item => item.id === currentGrafNodes?.finalNodeId)?.nama}</Text>
                            <NodeMarker
                              color={colors.purple}
                            />
                          </View>
                          :
                          <NodeMarker
                            color={colors.black}
                          /> :
                      id === pressNodeId ?
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
                          }}>{dataNode?.find(item => item.id === pressNodeId)?.nama}</Text>
                          <NodeMarker
                            color={(chooseMode && pressNodeId) ? pressNodeId === id ? colors.green : colors.black : colors.black}
                          />
                        </View>
                        :
                        <NodeMarker
                          color={(chooseMode && pressNodeId) ? pressNodeId === id ? colors.green : colors.black : colors.black}
                        />
                  )}
                </Marker>
              ))
        ) :
          dataNode?.map(item => (
            item?.tipe == 1 ?
              <Marker
                key={item?.id}
                coordinate={({
                  latitude: item?.latitude,
                  longitude: item?.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                })}
                tracksViewChanges={false}
                onPress={() => {
                  if (chooseMode) {
                    if (pressId !== item?.id && !dijkstraPoly) {
                      setPressNodeId(item?.id)
                    }
                  } else {
                    setPressid(item?.id)
                    setPressNodeId(null)
                    _map.current?.animateToRegion({
                      latitude: item?.latitude,
                      longitude: item?.longitude,
                      latitudeDelta: 0.004,
                      longitudeDelta: 0.004,
                    }, 1000)
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
                  }}>{item.nama}</Text>
                  <CustomMarker
                    color={(chooseMode || pressNodeId || pressId) ? pressNodeId === item?.id ? colors.green : pressId === item?.id ? colors.purple : colors.darkBlue : colors.darkBlue}
                  />
                </View>
              </Marker>
              : chooseMode &&
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
                onPress={() => {
                  if (!dijkstraPoly) {
                    setPressNodeId(item?.id)
                  }
                  if (!chooseMode) {
                    setPressid(null)
                  }
                }}
              >
                <NodeMarker
                  color={(chooseMode && pressNodeId) ? pressNodeId === item?.id ? colors.green : colors.black : colors.black}
                />
              </Marker>
          ))
        }
        {dijkstraPoly && (
          <>
            {yenKPoly.length > 0 && (
              <>
                {yenKPoly[1]?.path.some((str, index) => yenKPoly[1]?.path.indexOf(str) !== yenKPoly[1]?.path.lastIndexOf(str)) ? null : (
                  yenKPoly[1]?.edges?.map((edgeId, index) => (
                    <Polyline
                      key={index}
                      coordinates={dataGraf?.find(item => item.id === edgeId)?.polyline}
                      strokeWidth={3}
                      strokeColor={routeTabIndex === 1 ? colors.red : colors.darkGrey}
                    />
                  ))
                )}
                {yenKPoly[2]?.path.some((str, index) => yenKPoly[2]?.path.indexOf(str) !== yenKPoly[2]?.path.lastIndexOf(str)) ? null : (
                  yenKPoly[2]?.edges?.map((edgeId, index) => (
                    <Polyline
                      key={index}
                      coordinates={dataGraf?.find(item => item.id === edgeId)?.polyline}
                      strokeWidth={3}
                      strokeColor={routeTabIndex === 2 ? colors.red : colors.darkGrey}
                    />
                  ))
                )}
              </>
            )}
            {dijkstraPoly?.edges?.map(edgeId => (
              <Polyline
                key={edgeId}
                coordinates={dataGraf?.find(item => item.id === edgeId)?.polyline}
                strokeWidth={3}
                strokeColor={pressGraphId === edgeId ? colors.yellow : routeTabIndex === 0 ? colors.red : colors.darkGrey}
              />
            ))}
            {mainPoly?.edges?.map((edgeId, index) => (
              <Polyline
                key={index}
                coordinates={dataGraf?.find(item => item.id === edgeId)?.polyline}
                strokeWidth={3}
                strokeColor={pressGraphId === edgeId ? colors.yellow : routeTabIndex === 0 ? colors.red : routeTabIndex === 1 ? colors.purple : routeTabIndex === 2 ? colors.darkBlue : colors.darkGrey}
              />
            ))}
          </>
        )}
      </MapView>
      <Spinner
        visible={loading}
        textContent="Loading..."
      />
      {pressId ? (
        <BottomSheet
          ref={bottomSheetItemRef}
          onChange={(index) => {
            console.log('handleSheetChanges', index);
          }}
          index={0}
          snapPoints={snapPointsItem}
          style={styles.contentContainer}
          enablePanDownToClose={true}
          onClose={() => {
            if (!chooseMode) {
              setPressid(null)
              bottomSheetRef.current?.snapToIndex(0)
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
                bottomSheetItemRef.current?.close()
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
            {dataNode?.find(item => item?.id === pressId)?.foto && (
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
              <View style={{ marginBottom: 20 }}>
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
                          {item?.dewasa === '0' ? (
                            'Gratis'
                          ) : (
                            `Rp ${formatIDR.format(item?.dewasa).replace('IDR', '').trim()}`
                          )}
                        </Text>
                      ) : (
                        <>
                          <Text
                            style={{
                              color: colors.black,
                              fontSize: 16,
                            }}
                          >
                            {item?.dewasa === '0' ? (
                              'Gratis'
                            ) : (
                              `Rp ${formatIDR.format(item?.dewasa).replace('IDR', '').trim()} (Dewasa)`
                            )}
                          </Text>
                          <Text
                            style={{
                              color: colors.black,
                              fontSize: 16,
                            }}
                          >
                            {item?.dewasa === '0' ? (
                              'Gratis'
                            ) : (
                              `Rp ${formatIDR.format(item?.anak).replace('IDR', '').trim()} (Anak-anak)`
                            )}
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
          onChange={index => {
            console.log('handleSheetChanges', index);
          }}
          index={0}
          snapPoints={snapPoints}
          style={styles.contentContainer}
        >
          <BottomSheetView
            style={{
              paddingBottom: 10,
              backgroundColor: colors.white
            }}
          >
            <Text style={{
              fontWeight: '900',
              color: colors.black,
              fontSize: 20,
            }}>
              Daftar Objek Wisata
            </Text>
            <View style={{
              marginTop: 10,
              flexDirection: 'row',
              alignItems: 'center',
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
                    setSearchInput(value)
                    const dataObjek = dataNode?.filter(item => item?.tipe === 1)
                    const filterData = dataObjek?.filter(item => item?.nama?.includes(value))
                    setFilteredObjekWisata(filterData)
                  }}
                  value={searchInput}
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
          </BottomSheetView>
          <View style={{ flex: 1, marginBottom: 10 }}>
            {filteredObjekWisata && (
              <FlatList
                data={filteredObjekWisata?.filter(item => item?.tipe === 1)}
                renderItem={(item) => (
                  <TouchableOpacity
                    key={item?.item.id}
                    onPress={() => {
                      _map.current?.animateToRegion({
                        latitude: item?.item.latitude,
                        longitude: item?.item.longitude,
                        latitudeDelta: 0.004,
                        longitudeDelta: 0.004,
                      }, 1000)
                      setPressid(item?.item.id)
                      bottomSheetRef.current?.snapToIndex(0)
                    }}
                  >
                    <View style={styles.itemContainer}>
                      {item?.item.foto ? (
                        <Image
                          source={{
                            uri: item?.item.foto[0]?.uri,
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
                        <Text style={styles.textJudul}>{item?.item.nama}</Text>
                        <Text style={{
                          fontSize: 13,
                          color: colors.black,
                        }}>{item?.item.alamat ? item?.item.alamat : "Belum ada alamat"}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
          {/* <BottomSheetScrollView
            contentContainerStyle={{
              paddingBottom: 20,
              backgroundColor: colors.white
            }}
          >
            {filteredObjekWisata?.map(item => (
              <TouchableOpacity
                key={item?.id}
                onPress={() => {
                  _map.current?.animateToRegion({
                    latitude: item?.latitude,
                    longitude: item?.longitude,
                    latitudeDelta: 0.004,
                    longitudeDelta: 0.004,
                  }, 1000)
                  setPressid(item?.id)
                  bottomSheetRef.current?.snapToIndex(0)
                }}
              >
                <View style={styles.itemContainer}>
                  {item?.foto ? (
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
              </TouchableOpacity>
            ))}
          </BottomSheetScrollView> */}
        </BottomSheet>
      )}
      {dijkstraPoly && (
        <BottomSheet
          ref={bottomSheetRouteRef}
          onChange={(index) => {
            console.log('handleSheetChanges', index)
          }}
          snapPoints={snapPointsRoute}
          // enableDynamicSizing={true}
          style={styles.contentContainer}
          index={1}
        >
          <BottomSheetView style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: "space-between",
            marginBottom: 10
          }}>
            {pressGraphId && (
              <Pressable
                style={{
                  alignItems: 'center',
                  paddingRight: 20
                }}
                onPress={() => {
                  setPressGraphId(null)
                }}
              >
                <Ionicons
                  name={"arrow-back"}
                  style={{ color: colors.darkGrey, fontSize: 30 }}
                />
              </Pressable>
            )}
            <View
              style={{
                flex: 1,
                alignItems: 'center'
              }}
            >
              <Text style={{
                fontWeight: '900',
                color: colors.green,
                fontSize: 17,
                marginBottom: 4,
              }}>
                {pressGraphId ? dataNode?.find(item => item.id === currentGrafNodes?.startNodeId)?.nama : dataNode?.find(item => item?.id === pressNodeId)?.nama}
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
                style={{ color: pressGraphId ? colors.yellow : routeTabIndex === 0 ? colors.red : routeTabIndex === 1 ? colors.purple : routeTabIndex === 2 && colors.darkBlue, fontSize: 30 }}
              />
              <Text
                style={{
                  color: pressGraphId ? colors.yellow : routeTabIndex === 0 ? colors.red : routeTabIndex === 1 ? colors.purple : routeTabIndex === 2 && colors.darkBlue,
                  fontWeight: 'bold'
                }}
              >
                {pressGraphId ? dataGraf?.find(i => i?.id === pressGraphId)?.jarak : routeTabIndex === 0 ? dijkstraPoly?.distance : routeTabIndex === 1 ? jarakAlternatif : routeTabIndex === 2 && jarakAlternatif} m
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
                {pressGraphId ? dataNode?.find(item => item.id === currentGrafNodes?.finalNodeId)?.nama : dataNode?.find(item => item?.id === pressId)?.nama}
              </Text>
            </View>
          </BottomSheetView>
          <View style={{ flex: 1, marginBottom: 7 }}>
            {dijkstraPoly && (
              <FlatList
                data={routeTabIndex === 0 ? dijkstraPoly?.edges : routeTabIndex === 1 ? yenKPoly[1]?.edges : routeTabIndex === 2 && yenKPoly[2]?.edges}
                renderItem={item => (
                  <TouchableOpacity
                    key={item.item}
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
                      setPressGraphId(item.item)
                      const graphRegion = dataGraf?.find(i => i?.id === item.item)?.region
                      _map.current?.animateToRegion(graphRegion, 1000)
                      bottomSheetRouteRef.current?.snapToIndex(0)
                    }}
                  >
                    <Text
                      style={{
                        color: (pressGraphId && pressGraphId === item.item) ? colors.yellow : colors.black,
                        fontWeight: 'bold',
                        fontSize: 14,
                        flex: 1
                      }}
                    >
                      {dataNode?.find(i => i?.id === dataGraf?.find(i => i?.id === item.item)?.startNodeId)?.nama} - {dataNode?.find(i => i?.id === dataGraf?.find(i => i?.id === item.item)?.finalNodeId)?.nama}
                    </Text>
                    <Text
                      style={{
                        color: colors.black,
                        fontWeight: 'bold',
                        fontSize: 14,
                        // flex: 1
                      }}
                    >
                      {dataGraf?.find(i => i?.id === item.item)?.jarak} m
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
          {yenKPoly.length > 1 && (
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-around' }}
            >
              <Pressable
                style={{
                  alignItems: 'center',
                  padding: 10
                }}
                onPress={() => {
                  setRouteTabIndex(0)
                  setMainPoly(dijkstraPoly)
                  bottomSheetRouteRef.current?.snapToIndex(1)
                }}
              >
                <Ionicons
                  name='analytics-outline'
                  style={{
                    fontSize: 20,
                    color: routeTabIndex === 0 ? colors.red : colors.darkGrey,
                  }}
                />
                <Text
                  style={{
                    color: routeTabIndex === 0 ? colors.red : colors.darkGrey,
                    fontSize: 15,
                    fontWeight: '700'
                  }}
                >Rute</Text>
              </Pressable>
              {yenKPoly[1]?.path.some((str, index) => yenKPoly[1]?.path.indexOf(str) !== yenKPoly[1]?.path.lastIndexOf(str)) ? null : (
                <Pressable
                  style={{
                    alignItems: 'center',
                    padding: 10
                  }}
                  onPress={() => {
                    setRouteTabIndex(1)
                    setMainPoly(yenKPoly[1])
                    bottomSheetRouteRef.current?.snapToIndex(1)
                    setJarakAlternatif(countAltDistance(yenKPoly[1].edges))
                  }}
                >
                  <Ionicons
                    name='analytics-outline'
                    style={{
                      fontSize: 20,
                      color: routeTabIndex === 1 ? colors.purple : colors.darkGrey,
                    }}
                  />
                  <Text
                    style={{
                      color: routeTabIndex === 1 ? colors.purple : colors.darkGrey,
                      fontSize: 15,
                      fontWeight: '700'
                    }}
                  >Alternatif 1</Text>
                </Pressable>
              )}
              {yenKPoly[2]?.path.some((str, index) => yenKPoly[2]?.path.indexOf(str) !== yenKPoly[2]?.path.lastIndexOf(str)) ? null : (
                <Pressable
                  style={{
                    alignItems: 'center',
                    padding: 10
                  }}
                  onPress={() => {
                    setRouteTabIndex(2)
                    setMainPoly(yenKPoly[2])
                    bottomSheetRouteRef.current?.snapToIndex(1)
                    setJarakAlternatif(countAltDistance(yenKPoly[2].edges))
                  }}
                >
                  <Ionicons
                    name='analytics-outline'
                    style={{
                      fontSize: 20,
                      color: routeTabIndex === 2 ? colors.darkBlue : colors.darkGrey,
                    }}
                  />
                  <Text
                    style={{
                      color: routeTabIndex === 2 ? colors.darkBlue : colors.darkGrey,
                      fontSize: 15,
                      fontWeight: '700'
                    }}
                  >Alternatif 2</Text>
                </Pressable>
              )}
            </View>
          )}
          <TouchableOpacity
            style={{
              backgroundColor: colors.red,
              borderRadius: 15,
              alignItems: 'center',
              paddingVertical: 10,
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
              bottomSheetItemRef.current?.snapToIndex(1)
              setPressNodeId(null)
              setDijkstraPoly(null)
              setYenKPoly(null)
              setMainPoly(null)
              setJarakAlternatif(null)
              setCurrentGrafNodes(null)
              setPressGraphId(null)
              setRouteTabIndex(0)
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
        </BottomSheet>
      )}
      {(chooseMode && !dijkstraPoly) && (
        <>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            margin: 10,
            backgroundColor: colors.green,
            padding: 7,
            borderRadius: 10,
            marginBottom: 5
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
          {pressNodeId && (
            <>
              <View
                style={{ justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons
                  name={"arrow-down-circle-outline"}
                  style={{ color: colors.red, fontSize: 35 }}
                />
              </View>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                margin: 10,
                backgroundColor: colors.purple,
                padding: 7,
                borderRadius: 10,
                marginTop: 5
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
                  {dataNode?.find(item => item?.id === pressId).nama}
                </Text>
              </View>
            </>
          )}
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
                  const yenKresult = yenKShortestPaths(dijkstraResult, adjacencyList, pressNodeId, pressId, 3)
                  setDijkstraPoly(dijkstraResult)
                  setYenKPoly(yenKresult)
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
                bottomSheetItemRef.current?.snapToIndex(0)
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
    </View>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    // alignItems: 'center',
  },
  itemContainer: {
    paddingVertical: 12,
    // paddingHorizontal: 10,
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