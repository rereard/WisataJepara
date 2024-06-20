import { Text, TouchableOpacity, View, StyleSheet, Dimensions, ToastAndroid } from "react-native";
import { ScrollView, TextInput } from "react-native-gesture-handler";
import { colors } from "../../utility/colors";
import { useRef, useState, useEffect } from "react";
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapView, { Marker } from "react-native-maps";
import firestore from '@react-native-firebase/firestore';
import Spinner from "react-native-loading-spinner-overlay";
const { width, height } = Dimensions.get('window')
const SCREEN_HEIGHT = height
const SCREEN_WIDTH = width

function NodeMarker() {
  return (
    <Ionicons name={'ellipse-sharp'}
      style={{
        fontSize: 12,
        color: colors.black
      }}
    />
  );
}

export default function AddNode({ navigation, route }) {

  const { dataNode } = route.params

  const [node, setNode] = useState('')
  const [mapScreen, setMapScreen] = useState(false)
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [loading, setLoading] = useState(false)
  const [region, setRegion] = useState({
    latitude: -6.5811218,
    longitude: 110.6872181,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  })
  const [regionMarker, setRegionMarker] = useState({
    latitude: -6.5811218,
    longitude: 110.6872181,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  })

  const _map = useRef();

  useEffect(() => {
    navigation.setOptions({
      headerShown: mapScreen ? false : true
    })
  }, [navigation, mapScreen]);

  return (
    mapScreen ? (
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
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
        <MapView
          ref={_map}
          style={{
            ...StyleSheet.absoluteFillObject
          }}
          region={region}
          onRegionChangeComplete={(region) => {
            setRegionMarker(region)
          }}
          customMapStyle={[
            [
              {
                "featureType": "poi.business",
                "stylers": [
                  {
                    "visibility": "off"
                  }
                ]
              },
              {
                "featureType": "poi.park",
                "elementType": "labels.text",
                "stylers": [
                  {
                    "visibility": "off"
                  }
                ]
              }
            ]
          ]}
        >
          {dataNode?.map(item => (
            item?.tipe == 2 ?
              <Marker
                identifier={item?.id}
                key={item?.id}
                title={item?.nama}
                coordinate={({
                  latitude: item?.latitude,
                  longitude: item?.longitude,
                })}
                tracksViewChanges={false}
              >
                <NodeMarker />
              </Marker>
              :
              <Marker
                identifier={item?.id}
                key={item?.id}
                coordinate={({
                  latitude: item?.latitude,
                  longitude: item?.longitude,
                })}
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
                  }}>{item?.nama}</Text>
                  <Ionicons name={'location-sharp'}
                    style={{
                      fontSize: 40,
                      color: colors.darkBlue
                    }}
                  />
                </View>
              </Marker>
          ))}
        </MapView>
        <View
          style={{
            alignSelf: 'center',
            position: 'absolute',
            bottom: '10%',
            flexDirection: 'row',
            width: SCREEN_WIDTH * 0.90,
            justifyContent: 'space-around'
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: colors.red,
              borderRadius: 15,
              alignItems: 'center',
              paddingVertical: 10,
              flex: 1
            }}
            onPress={() => {
              setMapScreen(false)
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
              flex: 1
            }}
            onPress={() => {
              setMapScreen(false)
              setRegion(regionMarker)
              setLatitude(regionMarker.latitude)
              setLongitude(regionMarker.longitude)
            }}
          >
            <Text
              style={{
                color: colors.white,
                fontSize: 15,
                fontWeight: '700'
              }}
            >
              Pilih Lokasi Ini
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
      :
      (
        <ScrollView
          style={{
            paddingHorizontal: 30,
            paddingTop: 20,
            backgroundColor: colors.white,
            flex: 1
          }}
        >
          <Spinner
            visible={loading}
            textContent="Loading..."
          />
          <View
            style={{
              marginBottom: 20,
            }}
          >
            <Text style={{ color: colors.black, fontSize: 16, fontWeight: '700' }}>Nama Node</Text>
            <TextInput
              style={{
                borderBottomColor: colors.darkGrey,
                borderBottomWidth: 1,
                fontSize: 17,
                paddingVertical: 5,
                color: colors.black,
                paddingHorizontal: 0,
              }}
              placeholder="Nama Node"
              placeholderTextColor={colors.darkGrey}
              value={node}
              onChangeText={(value) => setNode(value)}
            />
          </View>
          {latitude !== null && longitude !== null ? (
            <>
              <View style={{
                width: '100%',
                height: 150,
                borderWidth: 0.5,
                marginBottom: 5
              }}>
                <MapView
                  // style={styles.map}
                  style={{ flex: 1 }}
                  region={{
                    latitude,
                    longitude,
                    latitudeDelta: 0.0004,
                    longitudeDelta: 0.0004
                  }}
                  liteMode={true}
                  onPress={() => {
                    setMapScreen(true)
                    setRegion({
                      latitude,
                      longitude,
                      latitudeDelta: 0.002,
                      longitudeDelta: 0.002
                    })
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude,
                      longitude,
                      latitudeDelta: 0.001,
                      longitudeDelta: 0.001
                    }}
                  />
                </MapView>
              </View>
              <View
                style={{
                  marginBottom: 20
                }}
              >
                <Text
                  style={{
                    color: colors.black
                  }}
                >
                  Latitude: {latitude}
                </Text>
                <Text
                  style={{
                    color: colors.black
                  }}
                >
                  Longitude: {longitude}
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.darkBlue,
                  borderRadius: 15,
                  borderColor: colors.darkBlue,
                  alignItems: 'center',
                  paddingVertical: 10,
                  flexDirection: 'row',
                  justifyContent: "center"
                }}
                onPress={() => {
                  if (node !== '') {
                    setLoading(true)
                    firestore().collection('node').add({
                      nama: node,
                      latitude: latitude,
                      longitude: longitude,
                      tipe: 2
                    }).then(doc => {
                      ToastAndroid.show('Berhasil menambah node', ToastAndroid.SHORT)
                      navigation.navigate('HomeAdmin')
                    }).catch(e => {
                      console.log(e);
                      ToastAndroid.show('Gagal menambahkan data', ToastAndroid.SHORT)
                    }).finally(() => {
                      setLoading(false)
                    })
                  } else {
                    ToastAndroid.show('Nama node tidak boleh kosong', ToastAndroid.SHORT)
                  }
                }}
              >
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 15,
                    fontWeight: '700'
                  }}
                >
                  Tambah Node
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: colors.darkBlue,
                borderRadius: 15,
                borderColor: colors.darkBlue,
                alignItems: 'center',
                paddingVertical: 10,
                flexDirection: 'row',
                justifyContent: "center"
              }}
              onPress={() => {
                setMapScreen(true)
              }}
            >
              <Ionicons
                name='location-outline'
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
                {" "}Tambah Lokasi
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )
  )
}