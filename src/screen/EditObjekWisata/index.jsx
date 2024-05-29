import { Text, TouchableOpacity, View, StyleSheet, Dimensions, ToastAndroid, Pressable, Image } from "react-native";
import { ScrollView, TextInput } from "react-native-gesture-handler";
import { colors } from "../../utility/colors";
import { useRef, useState, useEffect, useCallback, memo } from "react";
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapView, { Marker } from "react-native-maps";
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import ImageView from 'react-native-image-viewing'
import CheckBox from "@react-native-community/checkbox";
import DatePicker from "react-native-date-picker";
import Spinner from "react-native-loading-spinner-overlay";
const { width, height } = Dimensions.get('window')
const SCREEN_HEIGHT = height
const SCREEN_WIDTH = width
const includeExtra = true

export default function EditObjekWisata({ route, navigation }) {
  const { data } = route.params

  const [namaObjek, setNamaObjek] = useState(data?.nama ? data?.nama : "")
  const [mapScreen, setMapScreen] = useState(false)
  const [latitude, setLatitude] = useState(data?.latitude ? data?.latitude : "")
  const [longitude, setLongitude] = useState(data?.longitude ? data?.longitude : "")
  const [deskripsi, setDeskripsi] = useState(data?.deskripsi ? data?.deskripsi : "")
  const [alamat, setAlamat] = useState(data?.alamat ? data?.alamat : "")
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImageTrashIndex, setCurrentImageTrashIndex] = useState(0);
  const [visible, setIsVisible] = useState(false);
  const [trashVisible, setIsTrashVisible] = useState(false);
  const [image, setImage] = useState(data?.foto ? data?.foto : []);
  const [imageTemp, setImageTemp] = useState(data?.foto ? data?.foto : []);
  const [newImages, setNewImages] = useState([]);
  const [imageTrash, setImageTrash] = useState([]);
  const [loading, setLoading] = useState(false);
  const [jamBuka, setJamBuka] = useState(data?.jamBuka ? data?.jamBuka : Array.from({ length: 7 }, () => ({ buka: '', tutup: '' })))
  const [htm, setHtm] = useState(data?.htm ? data?.htm : Array.from({ length: 7 }, () => ({ dewasa: '', anak: '' })))
  const [samePrice, setSamePrice] = useState(data?.samePrice ? data?.samePrice : Array.from({ length: 7 }, () => ({ same: true })));
  const [openTimePicker, setOpenTimePicker] = useState(Array.from({ length: 7 }, () => ({ open: false })))
  const [closeTimePicker, setCloseTimePicker] = useState(Array.from({ length: 7 }, () => ({ open: false })))
  const [openEveryday, setOpenEveryday] = useState(data?.jamBuka ? data?.jamBuka?.every(item => item.buka === data?.jamBuka[0]?.buka && item?.tutup === data?.jamBuka[0]?.tutup) || data?.jamBuka?.every(item => item.buka === "" && item?.tutup === "") : true)
  const [samePriceDaily, setsamePriceDaily] = useState(data?.htm ? data?.htm?.every(item => item?.dewasa === data?.htm[0].dewasa && item?.anak === data?.htm[0].anak) && data?.htm?.every(item => item?.dewasa !== "" && item?.anak !== "") : true);
  const [region, setRegion] = useState({
    latitude: -6.5811218,
    longitude: 110.6872181,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  })
  const [regionMarker, setRegionMarker] = useState({
    latitude: -6.5811218,
    longitude: 110.6872181,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  })

  useEffect(() => {
    console.log("id", data?.id);
    console.log("namaObjek", namaObjek);
    console.log("latitude", latitude);
    console.log("longitude", longitude);
    console.log("deskripsi", deskripsi);
    console.log("alamat", alamat);
    console.log("image", image);
    console.log("jamBuka", jamBuka);
    console.log("samePrice", samePrice);
    console.log("openEveryday", openEveryday);
    console.log("samePriceDaily", samePriceDaily);
    console.log("imageTemp", imageTemp);
    console.log("newImages", newImages);
    console.log("trashimg", imageTrash);
  }, [namaObjek, latitude, longitude, deskripsi, alamat, image, imageTemp, jamBuka, samePrice, openEveryday, samePriceDaily, newImages, imageTrash]);

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
  const timeStringtoDate = useCallback((timeString) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return date;
  })

  const _map = useRef();

  useEffect(() => {
    navigation.setOptions({
      headerShown: mapScreen ? false : true
    })
  }, [navigation, mapScreen]);

  useEffect(() => {
    console.log("pickerOpen", openTimePicker);
    console.log("pickerClose", closeTimePicker);
    console.log("jamBuka", jamBuka);
  }, [openTimePicker, jamBuka, closeTimePicker]);

  const deleteTempImg = (uri) => {
    const img = imageTemp.filter((name) => uri !== name.uri)
    setImageTemp(img)
  }
  const deleteTrashImg = (uri) => {
    const img = imageTrash.filter((name) => uri !== name.uri)
    setImageTrash(img)
  }

  const selectPhotos = (type) => {
    const options = type === 'camera' ? {
      mediaType: 'photo',
      includeExtra,
      quality: 0.6,
    } : {
      selectionLimit: 1,
      mediaType: 'photo',
      includeExtra,
      quality: 0.6
    };
    if (type === 'camera') {
      launchCamera(options, (res) => {
        console.log('Response = ', res);
        if (res.didCancel) {
          console.log('User cancelled image picker');
        } else if (res.errorCode) {
          console.log('ImagePicker Error: ', res.errorMessage);
        } else {
          console.log('imgtemp', res);
          setImageTemp([...imageTemp, { uri: res.assets[0].uri }])
          setNewImages([...newImages, { uri: res.assets[0].uri }])
        }
      });
    } else {
      launchImageLibrary(options, (res) => {
        console.log('Response = ', res);
        if (res.didCancel) {
          console.log('User cancelled image picker');
        } else if (res.errorCode) {
          console.log('ImagePicker Error: ', res.errorMessage);
        } else {
          console.log('imgtemp', res);
          setImageTemp([...imageTemp, { uri: res.assets[0].uri }])
          setNewImages([...newImages, { uri: res.assets[0].uri }])
        }
      });
    }
  }

  const uploadImage = async (fileUri) => {
    const fileName = fileUri.substring(fileUri.lastIndexOf('/') + 1);
    const reference = storage().ref(`uploads/${fileName}`);
    await reference.putFile(fileUri);
    return await reference.getDownloadURL();
  };

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
            zIndex: 1,
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
            backgroundColor: colors.white,
          }}
        >
          <Spinner
            visible={loading}
            textContent="Loading..."
          />
          <View
            style={{
              marginBottom: 10,
            }}
          >
            <Text style={{ color: colors.red, marginTop: 10, fontStyle: 'italic' }}>* wajib diisi</Text>
            <ImageView
              images={imageTemp}
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
                    {`${imageIndex + 1} / ${imageTemp?.length}`}
                  </Text>
                </View>
              )}
            />
            <Text style={{ color: colors.black, fontSize: 16, fontWeight: '700', marginTop: 10, }}>Foto</Text>
            {imageTrash.length !== 0 && (
              <Text style={{ color: colors.black, fontSize: 16, marginTop: 5, }}>Foto yang dipakai:</Text>
            )}
            <ScrollView
              style={{
                marginTop: 10,
                marginBottom: 10
              }}
              horizontal={true}
            >
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                {imageTemp?.map((img, index) =>
                  <Pressable style={{ marginRight: 10 }} key={index} onPress={() => {
                    setIsVisible(true)
                    setCurrentImageIndex(index)
                  }}>
                    <Ionicons key={index} name={'trash-outline'}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        fontSize: 20,
                        padding: 10,
                        zIndex: 3,
                        color: 'red'
                      }}
                      onPress={() => {
                        deleteTempImg(img?.uri)
                        setImageTrash([...imageTrash, { uri: img?.uri }])
                      }}
                    />
                    <Image
                      source={{
                        uri: img?.uri
                      }}
                      style={{
                        height: 150,
                        width: 150,
                        borderRadius: 15,
                        marginRight: 7
                      }}
                    />
                  </Pressable>
                )}
                <View
                  style={{
                    flexDirection: 'row',
                  }}
                >
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={'camera-outline'}
                      style={{
                        fontSize: 40,
                        color: colors.darkBlue
                      }}
                      onPress={() => {
                        selectPhotos('camera')
                      }}
                    />
                    <Text style={{ color: colors.darkBlue, fontWeight: '600' }}>Ambil foto</Text>
                  </View>
                  <View style={{ borderEndWidth: 0.4, borderEndColor: colors.darkGrey, marginHorizontal: 10 }}></View>
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={'image-outline'}
                      style={{
                        fontSize: 40,
                        color: colors.darkBlue
                      }}
                      onPress={() => {
                        selectPhotos('gallery')
                      }}
                    />
                    <Text style={{ color: colors.darkBlue, fontWeight: '600' }}>Buka galeri</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
            {imageTrash.length !== 0 && (
              <>
                <ImageView
                  images={imageTrash}
                  imageIndex={currentImageTrashIndex}
                  visible={trashVisible}
                  onRequestClose={() => setIsTrashVisible(false)}
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
                        {`${imageIndex + 1} / ${imageTrash?.length}`}
                      </Text>
                    </View>
                  )}
                />
                <Text style={{ color: colors.black, fontSize: 16, marginTop: 5, marginBottom: 10 }}>Foto yang tidak dipakai:</Text>
                <ScrollView
                  style={{
                    marginBottom: 5
                  }}
                  horizontal={true}
                >
                  <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                    {imageTrash.map((img, index) =>
                      <Pressable style={{ marginRight: 10 }} key={index} onPress={() => {
                        setIsTrashVisible(true)
                        setCurrentImageTrashIndex(index)
                      }}>
                        <Ionicons key={index} name={'arrow-up-circle'}
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            fontSize: 30,
                            padding: 10,
                            zIndex: 3,
                            color: colors.green
                          }}
                          onPress={() => {
                            deleteTrashImg(img?.uri)
                            setImageTemp([...imageTemp, { uri: img?.uri }])
                          }}
                        />
                        <Image
                          source={{
                            uri: img?.uri
                          }}
                          style={{
                            height: 150,
                            width: 150,
                            borderRadius: 15,
                            marginRight: 7
                          }}
                        />
                      </Pressable>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
            <Text style={{ color: colors.black, fontSize: 16, fontWeight: '700', marginTop: 20 }}>Nama Objek Wisata<Text style={{ color: colors.red }}>*</Text></Text>
            <TextInput
              style={{
                borderBottomColor: colors.darkGrey,
                borderBottomWidth: 1,
                fontSize: 17,
                paddingVertical: 5,
                color: colors.black,
                paddingHorizontal: 0,
                marginBottom: 10
              }}
              placeholder="Nama Objek Wisata"
              placeholderTextColor={colors.darkGrey}
              value={namaObjek}
              onChangeText={(value) => setNamaObjek(value)}
            />
            <Text style={{ color: colors.black, fontSize: 16, fontWeight: '700' }}>Alamat<Text style={{ color: colors.red }}>*</Text></Text>
            <TextInput
              style={{
                borderBottomColor: colors.darkGrey,
                borderBottomWidth: 1,
                fontSize: 17,
                paddingVertical: 5,
                color: colors.black,
                paddingHorizontal: 0,
                marginBottom: 10
              }}
              placeholder="Alamat"
              placeholderTextColor={colors.darkGrey}
              value={alamat}
              onChangeText={(value) => setAlamat(value)}
            />
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
                      latitudeDelta: 0.0008,
                      longitudeDelta: 0.0008
                    }}
                    liteMode={true}
                    onPress={() => {
                      setMapScreen(true)
                      setRegion({
                        latitude,
                        longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01
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
                    marginBottom: 10
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
                  justifyContent: "center",
                  marginBottom: 10
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
            <Text style={{ color: colors.black, fontSize: 16, fontWeight: '700' }}>Deskripsi<Text style={{ color: colors.red }}>*</Text></Text>
            <TextInput
              style={{
                borderBottomColor: colors.darkGrey,
                borderBottomWidth: 1,
                fontSize: 17,
                paddingVertical: 5,
                color: colors.black,
                paddingHorizontal: 0,
                marginBottom: 10,
              }}
              multiline
              placeholder="Deskripsi Objek Wisata"
              placeholderTextColor={colors.darkGrey}
              value={deskripsi}
              onChangeText={(value) => setDeskripsi(value)}
            />
          </View>
          <Text style={{ color: colors.black, fontSize: 16, fontWeight: '700' }}>Waktu Buka</Text>
          {!openEveryday && (
            <Text style={{ color: colors.darkGrey, fontSize: 16, fontStyle: 'italic' }}>Kosongkan bila libur</Text>
          )}
          {openEveryday ? (
            <View
              style={{
                flexDirection: 'row',
                flex: 1,
                alignItems: 'center'
              }}
            >
              <Pressable
                style={{
                  borderBottomColor: colors.darkGrey,
                  borderBottomWidth: 1,
                  fontSize: 17,
                  color: colors.black,
                  marginBottom: 10,
                  paddingVertical: 10,
                  flex: 1,
                  alignItems: 'center'
                }}
                onPress={() => {
                  const pickerOpen = [...openTimePicker]
                  pickerOpen[0].open = true
                  setOpenTimePicker(pickerOpen)
                }}
              >
                <Text style={{ color: jamBuka[0].buka === '' ? colors.darkGrey : colors.black, fontSize: 16 }}>{jamBuka[0].buka === '' ? "---:---" : jamBuka[0].buka}</Text>
              </Pressable>
              <TimePicker
                open={openTimePicker[0].open}
                date={jamBuka[0].buka === '' ? new Date() : timeStringtoDate(jamBuka[0].buka)}
                onConfirm={(date) => {
                  console.log("waktu", date);
                  const pickerOpen = [...openTimePicker]
                  const openTime = [...jamBuka]
                  openTime.map(obj => {
                    obj.buka = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                  })
                  pickerOpen[0].open = false
                  setOpenTimePicker(pickerOpen)
                  setJamBuka(openTime)
                }}
                onCancel={() => {
                  const pickerOpen = [...openTimePicker]
                  pickerOpen[0].open = false
                  setOpenTimePicker(pickerOpen)
                }}
              />
              <Text style={{ color: colors.black, fontSize: 16 }}>–</Text>
              <Pressable
                style={{
                  borderBottomColor: colors.darkGrey,
                  borderBottomWidth: 1,
                  fontSize: 17,
                  color: colors.black,
                  marginBottom: 10,
                  paddingVertical: 10,
                  flex: 1,
                  alignItems: 'center'
                }}
                onPress={() => {
                  const pickerClose = [...closeTimePicker]
                  pickerClose[0].open = true
                  setCloseTimePicker(pickerClose)
                }}
              >
                <Text style={{ color: jamBuka[0].tutup === '' ? colors.darkGrey : colors.black, fontSize: 16 }}>{jamBuka[0].tutup === '' ? "---:---" : jamBuka[0].tutup}</Text>
              </Pressable>
              <TimePicker
                open={closeTimePicker[0].open}
                date={jamBuka[0].tutup === '' ? new Date() : timeStringtoDate(jamBuka[0].tutup)}
                onConfirm={(date) => {
                  console.log("waktu", date);
                  const openTime = [...jamBuka]
                  openTime.map(obj => {
                    obj.tutup = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                  })
                  const pickerClose = [...closeTimePicker]
                  pickerClose[0].open = false
                  setCloseTimePicker(pickerClose)
                  setJamBuka(openTime)
                }}
                onCancel={() => {
                  const pickerClose = [...closeTimePicker]
                  pickerClose[0].open = false
                  setCloseTimePicker(pickerClose)
                }}
              />
              <Ionicons name={'close-circle-outline'}
                style={{
                  fontSize: 30,
                  color: colors.darkGrey,
                  paddingLeft: 5
                }}
                onPress={() => {
                  const openTime = [...jamBuka]
                  openTime.map(obj => {
                    obj.buka = ``
                    obj.tutup = ``
                  })
                  setJamBuka(openTime)
                  setHtm(Array.from({ length: 7 }, () => ({ dewasa: '', anak: '' })))
                }}
              />
            </View>
          ) : (
            <View>
              {jamBuka.map((obj, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    flex: 1,
                    alignItems: 'center'
                  }}
                >
                  <Text
                    style={{
                      color: colors.black,
                      fontSize: 16,
                      flex: 1
                    }}
                  >
                    {dayFinder(index)}
                  </Text>
                  <Pressable
                    style={{
                      borderBottomColor: colors.darkGrey,
                      borderBottomWidth: 1,
                      fontSize: 17,
                      color: colors.black,
                      marginBottom: 10,
                      paddingVertical: 10,
                      flex: 1,
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      const pickerOpen = [...openTimePicker]
                      pickerOpen[index].open = true
                      setOpenTimePicker(pickerOpen)
                    }}
                  >
                    <Text style={{ color: jamBuka[index].buka === '' ? colors.darkGrey : colors.black, fontSize: 16 }}>{jamBuka[index].buka === '' ? "---:---" : jamBuka[index].buka}</Text>
                  </Pressable>
                  <TimePicker
                    open={openTimePicker[index].open}
                    date={jamBuka[index].buka === '' ? new Date() : timeStringtoDate(jamBuka[index].buka)}
                    onConfirm={(date) => {
                      console.log("waktu", date);
                      const pickerOpen = [...openTimePicker]
                      const openTime = [...jamBuka]
                      openTime[index].buka = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                      pickerOpen[index].open = false
                      setOpenTimePicker(pickerOpen)
                      setJamBuka(openTime)
                    }}
                    onCancel={() => {
                      const pickerOpen = [...openTimePicker]
                      pickerOpen[index].open = false
                      setOpenTimePicker(pickerOpen)
                    }}
                  />
                  <Text style={{ color: colors.black, fontSize: 16 }}>–</Text>
                  <Pressable
                    style={{
                      borderBottomColor: colors.darkGrey,
                      borderBottomWidth: 1,
                      fontSize: 17,
                      color: colors.black,
                      marginBottom: 10,
                      paddingVertical: 10,
                      flex: 1,
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      const pickerClose = [...closeTimePicker]
                      pickerClose[index].open = true
                      setCloseTimePicker(pickerClose)
                    }}
                  >
                    <Text style={{ color: jamBuka[index].tutup === '' ? colors.darkGrey : colors.black, fontSize: 16 }}>{jamBuka[index].tutup === '' ? "---:---" : jamBuka[index].tutup}</Text>
                  </Pressable>
                  <TimePicker
                    open={closeTimePicker[index].open}
                    date={jamBuka[index].tutup === '' ? new Date() : timeStringtoDate(jamBuka[index].tutup)}
                    onConfirm={(date) => {
                      console.log("waktu", date);
                      const pickerClose = [...closeTimePicker]
                      const openTime = [...jamBuka]
                      openTime[index].tutup = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                      pickerClose[index].open = false
                      setCloseTimePicker(pickerClose)
                      setJamBuka(openTime)
                    }}
                    onCancel={() => {
                      const pickerClose = [...closeTimePicker]
                      pickerClose[index].open = false
                      setCloseTimePicker(pickerClose)
                    }}
                  />
                  <Ionicons name={'close-circle-outline'}
                    style={{
                      fontSize: 25,
                      color: colors.darkGrey,
                      paddingLeft: 5
                    }}
                    onPress={() => {
                      const openTime = [...jamBuka]
                      const price = [...htm]
                      price[index].anak = ''
                      price[index].dewasa = ''
                      openTime[index].buka = ``
                      openTime[index].tutup = ``
                      setJamBuka(openTime)
                    }}
                  />
                </View>
              ))}
            </View>
          )}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <CheckBox
              value={openEveryday}
              onValueChange={(value) => {
                setOpenEveryday(value)
                if (value) {
                  setHtm(Array.from({ length: 7 }, () => ({ dewasa: '', anak: '' })))
                  setSamePrice(Array.from({ length: 7 }, () => ({ same: true })))
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
                fontSize: 16
              }}
            >
              Jam buka sama setiap hari
            </Text>
          </View>
          <Text style={{ color: colors.black, fontSize: 16, fontWeight: '700' }}>Harga Tiket Masuk</Text>
          {openEveryday && samePriceDaily ? (
            <View>
              {jamBuka.every(item => item.buka === '' || item.tutup === '') ? (
                <Text style={{ color: colors.darkGrey, fontSize: 16, fontStyle: 'italic' }}>Waktu buka belum terisi</Text>
              ) : (
                <>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 10
                  }}>
                    <CheckBox
                      value={samePriceDaily}
                      onValueChange={(value) => {
                        setsamePriceDaily(value)
                      }}
                      tintColors={{
                        true: colors.darkBlue,
                        false: colors.darkBlue
                      }}
                      style={{
                        transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
                      }}
                    />
                    <Text
                      style={{
                        color: colors.black,
                        fontSize: 16,
                        flex: 1
                      }}
                    >
                      Harga tiap hari sama
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center'
                      }}
                    >
                      {!samePrice[0].same && (
                        <Text
                          style={{
                            color: colors.black,
                            fontSize: 16,
                            flex: 1
                          }}
                        >
                          Dewasa
                        </Text>
                      )}
                      <TextInput
                        style={{
                          borderBottomColor: colors.darkGrey,
                          borderBottomWidth: 1,
                          fontSize: 17,
                          paddingVertical: 5,
                          color: colors.black,
                          paddingHorizontal: 0,
                          flex: 1
                        }}
                        placeholder="Harga"
                        placeholderTextColor={colors.darkGrey}
                        value={htm[0].dewasa}
                        keyboardType="number-pad"
                        onChangeText={(value) => {
                          const harga = [...htm]
                          if (samePrice[0].same) {
                            harga.map(item => {
                              item.dewasa = value
                              item.anak = value
                            })
                          } else {
                            harga.map(item => {
                              item.dewasa = value
                            })
                          }
                          setHtm(harga)
                        }}
                      />
                    </View>
                    {!samePrice[0].same && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: colors.black,
                            fontSize: 16,
                            flex: 1
                          }}
                        >
                          Anak-anak
                        </Text>
                        <TextInput
                          style={{
                            borderBottomColor: colors.darkGrey,
                            borderBottomWidth: 1,
                            fontSize: 17,
                            paddingVertical: 5,
                            color: colors.black,
                            paddingHorizontal: 0,
                            flex: 1
                          }}
                          placeholder="Harga"
                          placeholderTextColor={colors.darkGrey}
                          value={htm[0].anak}
                          keyboardType="number-pad"
                          onChangeText={(value) => {
                            const harga = [...htm]
                            harga.map(item => {
                              item.anak = value
                            })
                            setHtm(harga)
                          }}
                        />
                      </View>
                    )}
                  </View>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 10
                  }}>
                    <CheckBox
                      value={samePrice[0].same}
                      onValueChange={(value) => {
                        const sameRp = [...samePrice]
                        const harga = [...htm]
                        if (value) {
                          harga.map(item => {
                            item.anak = item.dewasa
                          })
                        }
                        setHtm(harga)
                        sameRp.map(item => {
                          item.same = value
                        })
                        setSamePrice(sameRp)
                      }}
                      tintColors={{
                        true: colors.darkBlue,
                        false: colors.darkBlue
                      }}
                      style={{
                        transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
                      }}
                    />
                    <Text
                      style={{
                        color: colors.black,
                        fontSize: 16,
                        flex: 1
                      }}
                    >
                      Harga tiap kelompok umur sama
                    </Text>
                  </View>
                </>
              )}
            </View>
          ) : (
            <View>
              {jamBuka.every(item => item.buka === '' || item.tutup === '') && (
                <Text style={{ color: colors.darkGrey, fontSize: 16, fontStyle: 'italic' }}>Waktu buka belum terisi</Text>
              )}
              {(openEveryday && jamBuka.every(item => item.buka !== '' || item.tutup !== '')) && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 10
                }}>
                  <CheckBox
                    value={samePriceDaily}
                    onValueChange={(value) => {
                      const harga = [...htm]
                      if (value) {
                        setHtm(Array.from({ length: 7 }, () => ({ dewasa: '', anak: '' })))
                        setSamePrice(Array.from({ length: 7 }, () => ({ same: true })))
                      }
                      setsamePriceDaily(value)
                    }}
                    tintColors={{
                      true: colors.darkBlue,
                      false: colors.darkBlue
                    }}
                    style={{
                      transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
                    }}
                  />
                  <Text
                    style={{
                      color: colors.black,
                      fontSize: 16,
                      flex: 1
                    }}
                  >
                    Harga tiap hari sama
                  </Text>
                </View>
              )}
              {jamBuka.map((item, index) => (
                (item.buka !== '' && item.tutup !== '') &&
                <View key={index}>
                  <Text
                    style={{
                      color: colors.black,
                      fontSize: 16,
                      fontWeight: 'bold',
                      marginTop: 7
                    }}
                  >
                    {dayFinder(index)}
                  </Text>
                  <View>
                    <View
                      style={{
                        flex: 1
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}
                      >
                        {!samePrice[index].same && (
                          <Text
                            style={{
                              color: colors.black,
                              fontSize: 16,
                              flex: 1
                            }}
                          >
                            Dewasa
                          </Text>
                        )}
                        <TextInput
                          style={{
                            borderBottomColor: colors.darkGrey,
                            borderBottomWidth: 1,
                            fontSize: 17,
                            paddingVertical: 5,
                            color: colors.black,
                            paddingHorizontal: 0,
                            flex: 1
                          }}
                          placeholder="Harga"
                          placeholderTextColor={colors.darkGrey}
                          value={htm[index].dewasa}
                          keyboardType="number-pad"
                          onChangeText={(value) => {
                            const harga = [...htm]
                            if (samePrice[index].same) {
                              harga[index].dewasa = value
                              harga[index].anak = value
                            } else {
                              harga[index].dewasa = value
                            }
                            setHtm(harga)
                          }}
                        />
                      </View>
                      {!samePrice[index].same && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <Text
                            style={{
                              color: colors.black,
                              fontSize: 16,
                              flex: 1
                            }}
                          >
                            Anak-anak
                          </Text>
                          <TextInput
                            style={{
                              borderBottomColor: colors.darkGrey,
                              borderBottomWidth: 1,
                              fontSize: 17,
                              paddingVertical: 5,
                              color: colors.black,
                              paddingHorizontal: 0,
                              flex: 1
                            }}
                            placeholder="Harga"
                            placeholderTextColor={colors.darkGrey}
                            value={htm[index].anak}
                            keyboardType="number-pad"
                            onChangeText={(value) => {
                              const harga = [...htm]
                              harga[index].anak = value
                              setHtm(harga)
                            }}
                          />
                        </View>
                      )}
                    </View>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 7,
                    }}>
                      <CheckBox
                        value={samePrice[index].same}
                        onValueChange={(value) => {
                          const sameRp = [...samePrice]
                          const harga = [...htm]
                          if (value) {
                            harga[index].anak = harga[index].dewasa
                          }
                          setHtm(harga)
                          sameRp[index].same = value
                          setSamePrice(sameRp)
                        }}
                        tintColors={{
                          true: colors.darkBlue,
                          false: colors.darkBlue
                        }}
                        style={{
                          transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
                        }}
                      />
                      <Text
                        style={{
                          color: colors.black,
                          fontSize: 16,
                          flex: 1
                        }}
                      >
                        Harga tiap kelompok umur sama
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={{
              backgroundColor: colors.darkBlue,
              borderRadius: 15,
              borderColor: colors.darkBlue,
              alignItems: 'center',
              paddingVertical: 10,
              flexDirection: 'row',
              justifyContent: "center",
              marginVertical: 20
            }}
            onPress={async () => {
              let imgTemp = [...imageTemp]
              if (namaObjek !== '' && alamat !== '' && latitude !== null && longitude !== null && deskripsi !== '') {
                const areAllPropertiesEmpty = jamBuka.every(obj => obj.buka === '' && obj.tutup === '');
                const isAnyPropertyPartiallyEmpty = jamBuka.some(obj => (obj.buka === '' && obj.tutup !== '') || (obj.buka !== '' && obj.tutup === ''));
                if (!areAllPropertiesEmpty && isAnyPropertyPartiallyEmpty) {
                  ToastAndroid.show('Informasi harap dilengkapi', ToastAndroid.SHORT)
                } else {
                  setLoading(true)
                  const trashOldImages = image.filter(obj1 => imageTrash.some(obj2 => obj2.uri === obj1.uri))
                  console.log("old image need to delete", trashOldImages);
                  const newImagesToUploadAndSave = imageTemp.filter(obj1 => newImages.some(obj2 => obj2.uri === obj1.uri))
                  console.log("new image to save", newImagesToUploadAndSave);
                  let downloadUrlsOfNewImages = []
                  try {
                    if (newImagesToUploadAndSave.length !== 0) {
                      console.log("we're here");
                      console.log("imgTemp", imgTemp);
                      downloadUrlsOfNewImages = await Promise.all(newImagesToUploadAndSave.map(async (image) => {
                        const downloadUrl = await uploadImage(image.uri)
                        return { uri: downloadUrl }
                      }))
                      const downloadUrl = [...downloadUrlsOfNewImages]
                      console.log("downloadUrl", downloadUrl);
                      newImagesToUploadAndSave.map((imgMap, index) => {
                        const indexOnImageTemp = imgTemp.findIndex(imgFind => imgMap.uri === imgFind.uri)
                        console.log("the index is", indexOnImageTemp);
                        imgTemp[indexOnImageTemp].uri = downloadUrl[index].uri
                      })
                      console.log("updated imageTemp", imgTemp);
                      setImageTemp(imgTemp)
                    }
                    if (trashOldImages.length !== 0) {
                      const deletePromises = trashOldImages.map(image => {
                        const imageRef = storage().refFromURL(image.uri);
                        return imageRef.delete();
                      });
                      await Promise.all(deletePromises)
                    }
                    await firestore().collection('node').doc(data?.id).update({
                      nama: namaObjek,
                      latitude: latitude,
                      longitude: longitude,
                      tipe: 1,
                      deskripsi,
                      alamat,
                      jamBuka,
                      htm,
                      samePrice,
                      foto: imageTemp
                    })
                    ToastAndroid.show('Berhasil mengubah objek wisata', ToastAndroid.SHORT)
                    navigation.navigate('HomeAdmin')
                  } catch (e) {
                    ToastAndroid.show('Gagal mengedit data', ToastAndroid.SHORT)
                    console.log(e);
                  } finally {
                    setLoading(false)
                  }
                }
              } else {
                ToastAndroid.show('Informasi harap dilengkapi', ToastAndroid.SHORT)
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
              Edit Objek Wisata
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )
  )
}

function TimePicker({ open, onConfirm, date, onCancel }) {
  return (
    <DatePicker
      modal
      open={open}
      date={date}
      mode="time"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}