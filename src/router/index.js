import {createStackNavigator} from '@react-navigation/stack';
import HomeAdmin from '../screen/HomeAdmin';
import AddObjekWisata from '../screen/AddObjekWisata';
import {colors} from '../utility/colors';
import AddNode from '../screen/AddNode';
import AddGraf from '../screen/AddGraf';
import Home from '../screen/Home';
import Login from '../screen/Login';
import auth from '@react-native-firebase/auth';
import {useEffect, useState} from 'react';
import EditObjekWisata from '../screen/EditObjekWisata';
import EditNode from '../screen/EditNode';

const Stack = createStackNavigator();

const Router = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState();

  function onAuthStateChanged(user) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, []);

  return (
    <Stack.Navigator initialRouteName={!user ? 'Home' : 'HomeAdmin'}>
      {!user ? (
        <>
          <Stack.Screen
            name="Home"
            component={Home}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Login"
            component={Login}
            options={{
              headerTitle: '',
              headerStyle: {
                backgroundColor: colors.darkBlue,
              },
              headerTintColor: colors.white,
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="HomeAdmin"
          component={HomeAdmin}
          options={{
            headerShown: false,
          }}
        />
      )}
      <Stack.Screen
        name="AddObjekWisata"
        component={AddObjekWisata}
        options={{
          headerTitle: 'Tambah Objek Wisata',
          headerStyle: {
            backgroundColor: colors.darkBlue,
          },
          headerTitleStyle: {
            color: colors.white,
          },
          headerTintColor: colors.white,
        }}
      />
      <Stack.Screen
        name="EditObjekWisata"
        component={EditObjekWisata}
        options={{
          headerTitle: 'Edit Objek Wisata',
          headerStyle: {
            backgroundColor: colors.darkBlue,
          },
          headerTitleStyle: {
            color: colors.white,
          },
          headerTintColor: colors.white,
        }}
      />
      <Stack.Screen
        name="AddNode"
        component={AddNode}
        options={{
          headerTitle: 'Tambah Node',
          headerStyle: {
            backgroundColor: colors.darkBlue,
          },
          headerTitleStyle: {
            color: colors.white,
          },
          headerTintColor: colors.white,
        }}
      />
      <Stack.Screen
        name="EditNode"
        component={EditNode}
        options={{
          headerTitle: 'Edit Node',
          headerStyle: {
            backgroundColor: colors.darkBlue,
          },
          headerTitleStyle: {
            color: colors.white,
          },
          headerTintColor: colors.white,
        }}
      />
      <Stack.Screen
        name="AddGraf"
        component={AddGraf}
        options={{
          headerTitle: 'Tambah Sisi',
          headerStyle: {
            backgroundColor: colors.darkBlue,
          },
          headerTitleStyle: {
            color: colors.white,
          },
          headerTintColor: colors.white,
        }}
      />
    </Stack.Navigator>
  );
};

export default Router;
