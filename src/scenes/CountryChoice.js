import React, {Component, PropTypes} from 'react';
import {AsyncStorage, View, StyleSheet, Image, Alert} from 'react-native';
import {connect} from 'react-redux';
import {LocationListView} from '../components';
import ApiClient from '../utils/ApiClient';
import I18n from '../constants/Messages';
import {getCountryFlag} from '../utils/helpers';
import styles from '../styles';
import store from '../store';
import {updateRegionIntoStorage} from '../actions/region';
import {updateCountryIntoStorage} from '../actions/country';


export default class CountryChoice extends Component {

    static contextTypes = {
        navigator: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        this.state = Object.assign({}, store.getState(), {
            locations: [],
            loaded: false
        });
    }

    async componentWillMount() {
        const {dispatch} = this.props;

        this.apiClient = new ApiClient(this.context, this.props);
        await this._loadInitialState();
    }

    async _getLocation(position, level) {
        const location = await this.apiClient.getLocationByPosition(position.coords.longitude, position.coords.latitude, level);
        if (location.length > 0) {
            const detectedLocation = location[0];
            detectedLocation.detected = true;
            detectedLocation.coords = position.coords;
            return detectedLocation;
        }
    }

    async _getCountryId(location) {
        const parent = await this.apiClient.getLocation(location.parent);
        if (parent.parent) {
            return await this.apiClient.getLocation(parent.parent);
        } else {
            return parent;
        }

    }

    async detectLocation() {
        this.setState({
            buttonDisabled: true
        });
        navigator.geolocation.getCurrentPosition(
            async(position) => {
                const {dispatch} = this.props;
                let location = await this._getLocation(position, 3);
                if (location) {
                    location.country = await this._getCountryId(location);
                    dispatch(updateCountryIntoStorage(location.country));
                    dispatch(updateRegionIntoStorage(location));

                    dispatch({type: 'REGION_CHANGED', payload: location});
                    dispatch({type: 'COUNTRY_CHANGED', payload: location.country});
                    Alert.alert(
                        I18n.t('LOCATION_TITLE_SUCCESS'),
                        `${I18n.t('LOCATION_SET_TO')} ${location.name}, ${location.country.name}.`,
                        [
                            {text: I18n.t('OK')}
                        ]
                    );
                    if (location.content && location.content.length == 1) {
                        this.context.navigator.to('infoDetails', null,
                            {section: location.content[0].section, sectionTitle: location.content[0].title})
                    } else {

                        this.context.navigator.to('info');
                    }
                } else {
                    location = await this._getLocation(position, 1);
                    if (location) {
                        Alert.alert(
                            I18n.t('LOCATION_TITLE_SUCCESS'),
                            `${I18n.t('LOCATION_SET_TO')} ${location.name}. ${I18n.t('LOCATION_PICK_CITY')}`,
                            [
                                {text: I18n.t('OK')}
                            ]
                        );
                        this.context.navigator.forward(null, '', {countryId: location.id});
                    } else {
                        Alert.alert(
                            I18n.t('LOCATION_TITLE_FAILED'),
                            `${I18n.t('LOCATION_SET_FAILED')}`,
                            [
                                {text: I18n.t('OK')}
                            ]
                        );
                        this._loadInitialState();
                    }
                }
            },
            (error) => {
                Alert.alert(
                    I18n.t('LOCATION_TITLE_FAILED'),
                    `${I18n.t('LOCATION_SET_FAILED')}`,
                    [
                        {text: I18n.t('OK')}
                    ]
                );
                this._loadInitialState();
            }, {enableHighAccuracy: false, timeout: 5000, maximumAge: 1000}
        );
    }

    async _loadInitialState() {
        const locations = await this.apiClient.getRootLocations();

        locations.forEach((c)=> {
            if (c && c.metadata) {
                c.pageTitle = (c.metadata.page_title || '')
                    .replace('\u060c', ',').split(',')[0];
            }
        });

        this.setState({
            locations,
            loaded: true,
            language: this.props.language,
            buttonDisabled: false
        });
    }

    onPress(rowData) {
        const {navigator} = this.context;
        navigator.forward(null, null, {countryId: rowData.id});
    }

    render() {
        return (
            <View style={styles.container}>
                <View style={styles.containerBelowLogo}>
                    <LocationListView
                        header={I18n.t('SELECT_COUNTRY')}
                        image={(countryISO) => getCountryFlag(countryISO)}
                        onPress={(rowData) => {this.onPress(rowData);}}
                        rows={this.state.locations}
                    />
                </View>
            </View>
        );
    }
}


const mapStateToProps = (state) => {
    return {
        ...state
    };
};

export default connect(mapStateToProps)(CountryChoice);
