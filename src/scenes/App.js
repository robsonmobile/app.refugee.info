import {
    AppRegistry,
    Text,
    View,
    Navigator,
    StatusBar,
    TouchableOpacity,
    Platform,
    BackAndroid
} from 'react-native';
import React, {Component, PropTypes} from 'react';
import Navigation from './Navigation';
import Navigate from '../utils/Navigate';
import {Toolbar} from '../components';
import Drawer from 'react-native-drawer'
import store from '../store';
import {connect} from 'react-redux';

import styles, {themes} from '../styles'

export class App extends Component {

    static childContextTypes = {
        drawer: React.PropTypes.object,
        navigator: React.PropTypes.object
    };

    constructor(props) {
        super(props);
        this.state = Object.assign({}, store.getState(), {
            drawer: null,
            navigator: null,
            drawerBackgroundColor: null,
            drawerBorderColor: null
        });
        BackAndroid.addEventListener('hardwareBackPress', this._hardwareBackPress);
    }


    componentWillReceiveProps(props) {
        /*
         HERE BE DRAGONS
         The only way to update the backgroundColor of the drawer and the main panel
         was to use its internal api, which may change without notice.
         */
        const {theme} = props;

        let backgroundColor = theme == 'light' ? themes.light.backgroundColor : themes.dark.backgroundColor;
        let drawerBackgroundColor = theme == 'light' ? themes.light.menuBackgroundColor : themes.dark.toolbarColor;
        let drawerBorderColor = theme == 'light' ? themes.light.dividerColor : themes.dark.backgroundColor;

        if (this.drawer) {
            this.drawer.drawer.setNativeProps({
                style: {
                    backgroundColor: drawerBackgroundColor,
                    borderLeftColor: drawerBorderColor
                }
            });
            this.drawer.main.setNativeProps({
                style: {
                    backgroundColor: backgroundColor
                }
            });
        }
    }

    getChildContext = () => {
        return {
            drawer: this.state.drawer,
            navigator: this.state.navigator
        };
    };

    toggleDrawer = () => {
        if (!this.state.drawerOpen) {
            this.drawer.open()
        } else {
            this.drawer.close();
        }
    };

    _hardwareBackPress = () => {
        if (this.state.drawerOpen) {
            this.drawer.close();
            return true;
        } else {
            return this.state.navigator._hardwareBackPress()
        }
    };

    setNavigator = (navigator) => {
        this.setState({
            navigator: new Navigate(navigator, store)
        });
    };

    render() {
        let {drawer, navigator} = this.state;
        const {direction, theme, country, dispatch} = this.props;

        let drawerStyles = {
            main: {
                backgroundColor: themes.light.backgroundColor
            },
            drawer: {
                borderLeftWidth: 1,
                borderLeftColor: themes.light.dividerColor,
                backgroundColor: themes.light.backgroundColor,
                shadowOpacity: 0.8,
                shadowRadius: 3
            }
        };
        let statusBar = (Platform.OS === 'ios')
            ?   <StatusBar barStyle={theme == 'light' ? "default" : 'light-content'}/>
            :   <StatusBar
                    translucent={true}
                    backgroundColor={theme == 'light' ? 'rgba(0,0,0,0.3)' : 'transparent'}
                />;
        return (
            <Drawer
                ref={(drawer) => {
                    this.drawer = drawer;
                } }
                type="displace"
                acceptTap={true}
                content={
                    <Navigation  />
                }
                tapToClose={true}
                styles={drawerStyles}
                onOpen={() => {
                    this.setState({ drawerOpen: true });
                    dispatch({ type: "DRAWER_CHANGED", payload: true });
                } }
                onClose={() => {
                    this.setState({ drawerOpen: false });
                    dispatch({ type: "DRAWER_CHANGED", payload: false });
                } }
                captureGestures={true}
                tweenDuration={100}
                panThreshold={0.08}
                openDrawerOffset={0.2}
                closedDrawerOffset={() => 0}
                panOpenMask={0.02}
                side={'right'}
            >
                {statusBar}
                <Navigator
                    configureScene={() => {
                            let sceneConfig = null;
                            if(Platform.OS == 'ios') {
                                sceneConfig = direction != 'rtl' ? {...Navigator.SceneConfigs.FloatFromLeft }  : {...Navigator.SceneConfigs.FloatFromRight } ;
                                sceneConfig.gestures = {...sceneConfig.gestures};
                                sceneConfig.gestures.pop ={...sceneConfig.gestures.pop};

                                if(!navigator || !navigator.isChild ) {
                                    sceneConfig.gestures.pop = null;
                                }
                            } else {
                                sceneConfig = Navigator.SceneConfigs.FadeAndroid;
                            }

                            return sceneConfig;
                        } }
                    initialRoute={Navigate.getInitialRoute() }
                    navigationBar={
                            <Toolbar
                                theme={theme}
                                drawerOpen={this.state.drawerOpen}
                                onMenuIconPress={this.toggleDrawer}
                            />
                        }
                    ref={(navigator) => { !this.state.navigator ? this.setNavigator(navigator) : null; } }
                    onDidFocus={() => {
                        }}
                    renderScene={(route) => {
                            if (this.state.navigator && route.component) {
                                if(navigator) { 
                                    navigator.updateIsChild(); 
                                }

                                let instance =
                                    <route.component
                                        path={route.path}
                                        title={route.title}
                                        {...route.props}
                                        />;
                                return (
                                    <View
                                        pointerEvents={this.state.drawerOpen ? 'none' : 'auto'}
                                        showsVerticalScrollIndicator={true}
                                        style={[styles.scene,
                                            theme=='dark' && {backgroundColor: themes.dark.backgroundColor},
                                            (navigator && navigator.currentRoute && navigator.currentRoute.component.smallHeader) && 
                                            {paddingTop: (Platform.Version >= 21 || Platform.OS == 'ios') ? 80 : 55}
                                        ]}
                                        >
                                        {instance}
                                    </View>
                                );
                            }
                        } }
                />
            </Drawer>
        )
    }
}

const mapStateToProps = (state) => {
    return {
        theme: state.theme,
        direction: state.direction,
        country: state.country
    };
};

export default connect(mapStateToProps)(App);
