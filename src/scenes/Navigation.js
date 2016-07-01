import React, {Component, PropTypes} from 'react';
import {Text, Image, View, ScrollView, StyleSheet} from 'react-native';
import {connect} from 'react-redux';
import {Avatar, Drawer, Divider, COLOR, TYPO} from 'react-native-material-design';

import {typography} from 'react-native-material-design-styles';

import { TouchableNativeFeedback, Platform} from "react-native";
import {Ripple, Icon} from 'react-native-material-design';

import I18n from '../constants/Messages';
import {capitalize} from '../utils/helpers';
import ApiClient from '../utils/ApiClient';
import DrawerCommons from '../utils/DrawerCommons';
import {Header, Section, DirectionalText, MenuSection, MenuItem} from '../components'
import CountryHeaders from '../constants/CountryHeaders'

import {updateRegionIntoStorage} from '../actions/region';
import {updateCountryIntoStorage} from '../actions/country';
import store from '../store';

const rectangularLogo = require('../assets/logo-rect.png');
const bullseye = require('../assets/icons/bullseye.png');

import styles, {generateTextStyles, themes} from '../styles'


export function isCompatible(feature) {
    const version = Platform.Version;

    switch (feature) {
        case 'TouchableNativeFeedback':
            return version >= 21;
            break;
        case 'elevation':
            return version >= 21;
            break;
        default:
            return true;
            break;
    }
}

class Navigation extends Component {

    static contextTypes = {
        drawer: PropTypes.object.isRequired,
        navigator: PropTypes.object
    };

    constructor(props) {
        super(props);
        this.drawerCommons = new DrawerCommons(this);
        this.state = {
            otherLocations: [],
        }
    }

    async componentWillReceiveProps(props) {
        if (props.country) {
            const children = await this.loadCities(props.country.id);

            this.setState({ otherLocations: children.slice(0, 5) });
        }
    }

    async loadCities(countryId) {
        let cities = [];
        let apiClient = new ApiClient(this.context, this.props);

        const regions = await apiClient.getRegions(countryId);
        const children = await apiClient.getCities(countryId);
        cities = cities.concat(children);
        const promises = [];
        for (let region of regions) {
            promises.push(apiClient.getCities(region.id));
        }
        return await Promise.all(promises).then((citiesList) => {
            for (let _cities of citiesList) {
                cities = cities.concat(_cities);
            }
            cities.forEach((c) => {
                if (c && c.metadata) {
                    const pageTitle = (c.metadata.page_title || '')
                        .replace('\u060c', ',').split(',')[0];
                    c.pageTitle = pageTitle;
                }
            });

            return cities
        });
    }

    _getImportantInformation() {
        const region = this.props.region;
        if (!region || !region.important_information) {
            return <View />;
        }
        let s = (scene) => this.drawerCommons.changeScene(scene);
        return region.important_information.map((i, index) => {
            return (
                <MenuItem key={index} onPress={() => s('info') }>{i.metadata.page_title}</MenuItem>
            );
        });
    }

    async selectCity(city) {
        const { dispatch, country } = this.props;

        city.detected = false;
        city.coords = {};
        city.country = country;

        dispatch(updateCountryIntoStorage(city.country));
        dispatch(updateRegionIntoStorage(city));

        dispatch({ type: 'REGION_CHANGED', payload: city });
        dispatch({ type: 'COUNTRY_CHANGED', payload: city.country });

        this.drawerCommons.closeDrawer();

        if (city.content && city.content.length == 1) {
            return this.context.navigator.to('infoDetails', null, { section: city.content[0].section, sectionTitle: city.content[0].title });
        } else {
            return this.context.navigator.to('info', null, null, store.getState());
        }
    }

    render() {
        const {theme, route, region, country, direction, language} = this.props;
        const {navigator} = this.context;

        if (!this.props.region) {
            return <Text>Choose location first</Text>;
        }

        if (!this.props.country) {
            return <Text>Choose location first</Text>;
        }

        let importantInformationItems = this._getImportantInformation();
        let nearbyCitiesItems = this.state.otherLocations.map((i, index) => {
            return <MenuItem key={index} onPress={() => s('info') }>{i.pageTitle}</MenuItem>;
        });
        let styles = theme == 'light' ? lightNavigationStyles : {};

        // Shorthand to change scene
        let s = (scene) => this.drawerCommons.changeScene(scene);

        let headerImage = <Image source={bullseye} style={[
            { resizeMode: 'stretch', height: 20, width: 20, },
            (direction == 'ltr' ? { marginRight: 10 } : { marginLeft: 10 })
        ]} />;

        const isLTR = direction == 'ltr';

        return <ScrollView style={styles.outermostBorder}>
            <View style={styles.middleBorder}>
                <View style={styles.view}>
                    <View>
                        <Image source={rectangularLogo} style={styles.logo} />
                    </View>
                    <View style={[styles.titleWrapper, { justifyContent: ((isLTR) ? 'flex-start' : 'flex-end'), }]}>
                        {(isLTR) && headerImage}
                        <Text style={[generateTextStyles(language), styles.cityText]}>{region.pageTitle.toUpperCase() }</Text>
                        {(!isLTR) && headerImage}
                    </View>
                    <MenuSection title={I18n.t("REFUGEE_INFO") }>
                        <MenuItem icon="info" active={route === 'info'} onPress={() => s('info') }>{I18n.t('GENERAL_INFO') }</MenuItem>
                        <MenuItem icon="list" active={route === 'services'} onPress={() => s('services') }>{I18n.t('SERVICE_LIST') }</MenuItem>
                        <MenuItem icon="map" active={route === 'map'} onPress={() => s('map') }>{I18n.t('EXPLORE_MAP') }</MenuItem>
                    </MenuSection>
                    <MenuSection title={I18n.t("IMPORTANT_INFORMATION") }>
                        {importantInformationItems}
                    </MenuSection>
                    <MenuSection title={I18n.t("CHANGE_LOCATION") }>
                        {nearbyCitiesItems}
                    </MenuSection>
                    <MenuSection>
                        <MenuItem icon="settings" active={route === 'settings'} onPress={() => s('settings') }>{I18n.t('SETTINGS') }</MenuItem>
                        <MenuItem icon="public" active={route === 'settings'} onPress={() => s('settings') }>{I18n.t('ABOUT') }</MenuItem>
                        <MenuItem icon="public" active={route === 'settings'} onPress={() => s('settings') }>{I18n.t('CONTACT_US') }</MenuItem>
                        <MenuItem icon="settings" active={route === 'settings'} onPress={() => s('settings') }>{I18n.t('FEEDBACK') }</MenuItem>
                    </MenuSection>
                    <View style={{ paddingBottom: 15 }}>
                    </View>
                </View>
            </View>
        </ScrollView>;
    }
}

const mapStateToProps = (state) => {
    return {
        route: state.navigation,
        region: state.region,
        country: state.country,
        language: state.language,
        direction: state.direction,
        theme: state.theme.theme,
        drawerOpen: state.drawerOpen
    };
};

const lightNavigationStyles = StyleSheet.create({
    logo: {
        width: 150,
        resizeMode: 'contain',
        marginTop: 10,
    },
    view: {
        flexDirection: 'column',
        flex: 1,
        alignItems: 'stretch',
        paddingLeft: 20,
        borderLeftColor: themes.light.lighterDividerColor,
        borderLeftWidth: 1,
    },
    middleBorder: {
        borderLeftColor: themes.light.darkerDividerColor,
        borderLeftWidth: 1,
    },
    outermostBorder: {
        borderLeftColor: themes.light.dividerColor,
        borderLeftWidth: 1,
    },
    titleWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 30,
        marginBottom: 15,
        paddingRight: 10
    },
    cityText: {
        fontSize: 14,
        fontWeight: 'bold',
    }
});

console.log(themes);
export default connect(mapStateToProps)(Navigation);
