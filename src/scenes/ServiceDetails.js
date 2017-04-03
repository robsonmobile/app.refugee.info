import React, {Component, PropTypes} from 'react';
import {
    StyleSheet,
    ListView,
    View,
    Linking,
    Platform,
    Image,
    ScrollView
} from 'react-native';
import {Icon, DirectionalText} from '../components';
import MapView from 'react-native-maps';
import I18n from '../constants/Messages';
import ApiClient from '../utils/ApiClient';
import {connect} from 'react-redux';
import Share from 'react-native-share';
import {OfflineView, Divider, Button} from '../components';
import styles, {themes} from '../styles';
import {WEB_PATH} from '../constants';
import {MAPBOX_TOKEN} from '../constants';
import {checkPlayServices} from '../utils/GooglePlayServices';
import {GA_TRACKER} from '../constants';
import {Actions} from 'react-native-router-flux';

let Mapbox;
if (Platform.OS === 'android') {
    Mapbox = require('react-native-mapbox-gl');
    Mapbox.setAccessToken(MAPBOX_TOKEN);
}

const RADIUS = 0.01;
const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SHOW_SHARE_BUTTON = true;


export class ServiceDetails extends Component {
    static backButton = true;

    static propTypes = {
        location: PropTypes.shape({
            id: PropTypes.number,
            name: PropTypes.string.isRequired
        }),
        region: PropTypes.object,
        service: PropTypes.shape({
            id: PropTypes.number,
            name: PropTypes.string,
            provider_fetch_url: PropTypes.string.isRequired
        }),
        serviceType: PropTypes.shape({
            icon_url: PropTypes.string
        })
    };

    constructor(props) {
        super(props);
        this.state = {
            dataSource: new ListView.DataSource({
                rowHasChanged: (row1, row2) => row1 !== row2
            }),
            loaded: false,
            modalVisible: false,
            refreshing: false,
            service: this.props.service,
            offline: false,
            name: '',
            comment: ''
        };
        this.onRefresh = this.onRefresh.bind(this);
        this.call = this.call.bind(this);
    }

    componentWillMount() {
        Actions.refresh({title: this.props.service.name});
    }

    componentDidMount() {
        this.apiClient = new ApiClient(this.context, this.props);
        if (!this.state.loaded) {
            checkPlayServices().then((available) => {
                let nativeAvailable = (Platform.OS === 'ios' || available);
                this.setState({nativeAvailable});
                this.fetchData().done();
            });
        }
    }

    async fetchData(update) {
        let service = this.props.service;
        GA_TRACKER.trackEvent('service-view', String(service.id));

        try {
            if (update) {
                let services = await this.apiClient.getService(service.id, true);
                if (services.length > 0) {
                    service = services[0];
                }
            }
            let provider = service.provider;

            this.setState({
                loaded: true,
                provider,
                service,
                offline: false
            });
        }
        catch (e) {
            this.setState({
                offline: true
            });
        }
    }

    onRefresh() {
        this.setState({refreshing: true});
        this.fetchData(true).then(() => {
            this.setState({refreshing: false});
        });
    }

    getDirections(lat, long) {
        if (this.state.loaded) {
            requestAnimationFrame(() => {
                let location = `${lat},${long}`;
                if (Platform.OS === 'ios') {
                    return Linking.openURL(`http://maps.apple.com/?daddr=${lat},${long}&dirflg=w&t=m`);
                }
                return Linking.openURL(`geo:${location}?q=${location}`);
            });
        }
    }

    call() {
        if (this.state.loaded) {
            requestAnimationFrame(() => {
                const {provider, service} = this.state;
                Linking.openURL(`tel:${service.phone_number || provider.phone_number}`);
            });
        }
    }

    findOnFacebook() {
        if (!this.state.loaded) {
            return;
        }
        const {service} = this.props;
        let prefix = service.facebook_page.startsWith('http') ? '' : 'http://';
        requestAnimationFrame(() => {
            return Linking.openURL(`${prefix}${service.facebook_page}`);
        });
    }

    openWebsite() {
        if (!this.state.loaded) {
            return;
        }
        const {service} = this.props;
        let prefix = service.website.startsWith('http') ? '' : 'http://';
        requestAnimationFrame(() => {
            return Linking.openURL(`${prefix}${service.website}`);
        });
    }

    sendEmail() {
        if (!this.state.loaded) {
            return;
        }
        const {service} = this.props;
        let prefix = 'mailto:';
        requestAnimationFrame(() => {
            return Linking.openURL(`${prefix}${service.email}`);
        });
    }

    onShareClick() {
        if (this.state.loaded) {
            const {provider, service} = this.state;
            const {region} = this.props;
            let address = service.address || provider.address;
            let phoneNumber = service.phone_number || provider.phone_number || '';
            let text = `${service.name}\n${provider.name}\n${address}\n${phoneNumber}`;
            requestAnimationFrame(() => {
                Share.open({
                    message: text,
                    url: `${WEB_PATH}/${region.slug}/services/${service.id}`,
                    title: service.name,
                    subject: service.name
                }).catch();
            });
        }
    }

    formatDateTime(datetime) {
        const date = new Date(datetime);
        return ` ${date.toLocaleString().replace(',', '')}`;
    }

    renderOpeningHoursRow(day) {
        const {service} = this.props;
        let open = service[`${day}_open`];
        let close = service[`${day}_close`];
        if ((!open && !close) || open == close) {
            return (
                <View style={[styles.row, styles.flex]}>
                    <DirectionalText style={[
                        styles.flex,
                        styles.sectionContent,
                        styles.textLight,
                        {textAlign: 'center'}
                    ]}
                    >
                        {I18n.t('CLOSED').toUpperCase() }
                    </DirectionalText>
                </View>
            );
        }
        return (
            <View style={[styles.row, styles.flex]}>
                <DirectionalText style={[
                    styles.flex,
                    styles.sectionContent,
                    {textAlign: 'right'}]}
                >
                    {service[`${day}_open`] &&
                    service[`${day}_open`].substr(0, service[`${day}_open`].lastIndexOf(':')) }
                </DirectionalText>

                <DirectionalText style={[styles.sectionContent, {textAlign: 'center', flex: 0.5}]}>-</DirectionalText>

                <DirectionalText style={[
                    styles.flex,
                    styles.sectionContent,
                    {textAlign: 'left'}]}
                >
                    {service[`${day}_close`] &&
                    service[`${day}_close`].substr(0, service[`${day}_close`].lastIndexOf(':')) }
                </DirectionalText>
            </View>
        );
    }

    renderOpeningHours() {
        const {service} = this.props;
        let opened_days_count = 0;
        for (let i = 0; i <= days.length; i++) {
            if (service[`${days[i]}_open`] || service[`${days[i]}_close`])
                opened_days_count += 1;
        }
        if (opened_days_count === 0) {
            return;
        }
        const weekDay = days[new Date().getDay()];

        return (
            <View style={[styles.detailsContainer]}>
                <View style={styles.row}>
                    <View style={[componentStyles.sectionIconContainer]}>
                        <Icon
                            name="md-time"
                            style={componentStyles.sectionIcon}
                        />
                    </View>
                    <View style={styles.flex}>
                        <DirectionalText style={componentStyles.sectionHeader}>
                            {I18n.t('OPENING_HOURS') }
                        </DirectionalText>
                        {days.map((day) => (
                            <View
                                key={day}
                                style={[
                                    styles.row,
                                    styles.bottomDividerLight,
                                    {borderBottomWidth: 1, padding: 5},
                                    (day === weekDay)
                                        ? styles.dividerLight
                                        : null
                                ]}
                            >
                                <DirectionalText style={[
                                    {flex: 0.5},
                                    styles.sectionContent
                                ]}
                                >
                                    {I18n.t(day.toUpperCase()) }
                                </DirectionalText>
                                {this.renderOpeningHoursRow(day)}
                            </View>
                        )) }
                    </View>
                </View>
            </View>
        );
    }

    renderMapView(nativeAvailable) {
        const {service} = this.props;
        let {loaded} = this.state;

        if (!loaded) {
            return <View style={styles.map}/>;
        }

        const lat = parseFloat(service.location.coordinates[1]),
            long = parseFloat(service.location.coordinates[0]),
            initialRegion = {
                latitude: lat,
                longitude: long,
                latitudeDelta: RADIUS,
                longitudeDelta: RADIUS
            },
            coordinate = {
                latitude: lat,
                longitude: long
            };

        if (nativeAvailable) {
            return (
                <MapView
                    cacheEnabled
                    initialRegion={initialRegion}
                    scrollEnabled={false}
                    style={styles.map}
                >
                    <MapView.Marker coordinate={coordinate}>
                        <View style={componentStyles.marker}>
                            <Image source={require('../assets/marker.png')}/>
                        </View>
                    </MapView.Marker>
                </MapView>
            );
        }

        let latitudeMultiplier = lat > 0 ? 1 : -1;
        let longitudeMultiplier = long > 0 ? 1 : -1;

        let latSW = lat - (RADIUS * latitudeMultiplier);// - latSW == 0;
        let longSW = long - (RADIUS * longitudeMultiplier);

        let latNE = lat + (RADIUS * latitudeMultiplier);
        let longNE = long + (RADIUS * longitudeMultiplier);


        let annotations = [{
            coordinates: [lat, long],
            type: 'point',
            id: `marker_${service.id}`
        }];

        return (
            <Mapbox.MapView
                annotations={annotations}
                initialCenterCoordinate={coordinate}
                onFinishLoadingMap={() => {
                    this._mapBoxLoaded = true;
                    this._mapBox.setVisibleCoordinateBounds(latSW, longSW, latNE, longNE);
                }}
                ref={map => {
                    this._mapBox = map;
                }}
                rotateEnabled={false}
                scrollEnabled={false}
                showsUserLocation
                style={styles.map}
                zoomEnabled={false}
            />
        );

    }

    renderServiceDescription() {
        const {service} = this.props;
        if (!service.description) {
            return <View />;
        }
        return (
            <View style={[styles.detailsContainer]}>
                <View style={styles.row}>
                    <View style={[componentStyles.sectionIconContainer]}>
                        <Icon
                            name="fa-info"
                            style={componentStyles.sectionIcon}
                        />
                    </View>
                    <View style={styles.flex}>
                        <DirectionalText style={[componentStyles.sectionHeader, styles.textLight]}>
                            {I18n.t('DESCRIPTION') }
                        </DirectionalText>
                        <DirectionalText style={[styles.sectionContent, styles.textLight]}>
                            {service.description}
                        </DirectionalText>
                    </View>
                </View>
            </View>
        );
    }

    renderServiceAdditionalInfo() {
        const {service} = this.props;
        if (!service.additional_info) {
            return <View />;
        }
        return (
            <View style={[styles.detailsContainer]}>
                <View style={styles.row}>
                    <View style={[componentStyles.sectionIconContainer]} />
                    <View style={styles.flex}>
                        <DirectionalText style={[componentStyles.sectionHeader, styles.textLight]}>
                            {I18n.t('ADDITIONAL_INFORMATION') }
                        </DirectionalText>
                        <DirectionalText style={[styles.sectionContent, styles.textLight]}>
                            {service.additional_info}
                        </DirectionalText>
                    </View>
                </View>
            </View>
        );
    }

    renderServiceAddress() {
        const {service} = this.props;
        if (!service.address && !service.provider.address) {
            return <View />;
        }
        return (
            <View style={[styles.detailsContainer]}>
                <View style={styles.row}>
                    <View style={[componentStyles.sectionIconContainer]}>
                        <Icon
                            name="ios-pin"
                            style={componentStyles.sectionIcon}
                        />
                    </View>
                    <View style={styles.flex}>
                        <DirectionalText style={[componentStyles.sectionHeader, styles.textLight]}>
                            {I18n.t('ADDRESS') }
                        </DirectionalText>
                        <DirectionalText style={[styles.sectionContent, styles.textLight]}>
                            {(service.address || service.provider.address) }
                        </DirectionalText>
                        {service.address_in_country_language &&
                        <DirectionalText style={[styles.sectionContent, styles.textLight]}>
                            {service.address_in_country_language}
                        </DirectionalText>}
                    </View>
                </View>
            </View>
        );
    }

    render() {
        const {nativeAvailable, loaded, provider} = this.state;
        if (!loaded) {
            return <View />;
        }
        const {service} = this.props,
            locationName = loaded && (service.region.title || ''),
            hasPhoneNumber = loaded && !!provider.phone_number,
            hasFacebookPage = loaded && !!service.facebook_page,
            hasEmail = loaded && !!service.email,
            hasWebsite = loaded && !!service.website,

            lat = parseFloat(service.location.coordinates[1]),
            long = parseFloat(service.location.coordinates[0]),

            mapView = this.renderMapView(nativeAvailable),
            openingHoursView = this.renderOpeningHours(),
            serviceDescriptionView = this.renderServiceDescription(),
            serviceAdditionalInfoView = this.renderServiceAdditionalInfo(),
            serviceAddressView = this.renderServiceAddress();

        return (
            <ScrollView style={styles.container}>
                <OfflineView
                    offline={this.state.offline}
                    onRefresh={this.onRefresh}
                />
                {mapView}
                <View style={[styles.detailsContainer, {paddingBottom: 0}]}>
                    <View style={[styles.row, {paddingBottom: 5}]}>
                        <Icon
                            name="ios-pin"
                            style={{marginHorizontal: 8, fontSize: 14, color: themes.light.textColor}}
                        />
                        <DirectionalText style={{color: themes.light.textColor, fontSize: 13}}>
                            {locationName}
                        </DirectionalText>
                    </View>
                    <View style={[styles.row, {paddingBottom: 5}]}>
                        <DirectionalText style={{color: themes.light.textColor, fontSize: 12, marginHorizontal: 8}}>
                            {I18n.t('SERVICE_PROVIDER')}:
                            <DirectionalText style={styles.title}>
                                {` ${service.provider.name}`}
                            </DirectionalText>
                        </DirectionalText>
                    </View>
                    <Divider />
                </View>
                {service.image &&
                <View style={componentStyles.imageContainer}>
                    <Image
                        resizeMode="cover"
                        source={{uri: service.image}}
                        style={componentStyles.image}
                    />
                </View>}
                <View style={componentStyles.updateTextContainer}>
                    <DirectionalText style={componentStyles.updateText}>
                        {I18n.t('LAST_UPDATED_ON')}:
                    </DirectionalText>
                    <DirectionalText style={componentStyles.updateText}>
                        {this.formatDateTime(service.updated_at)}
                    </DirectionalText>
                </View>

                {serviceDescriptionView}
                {serviceAdditionalInfoView}
                {serviceAddressView}
                {openingHoursView}

                <View style={styles.detailsContainer}>
                    <Button
                        buttonStyle={{marginBottom: 5}}
                        color="green"
                        icon="fa-map"
                        iconStyle={{fontSize: 20, marginHorizontal: 5}}
                        onPress={() => this.getDirections(lat, long)}
                        text={I18n.t('GET_DIRECTIONS')}
                        textStyle={{fontSize: 15}}
                    />
                    {hasEmail &&
                    <Button
                        buttonStyle={{marginBottom: 5}}
                        color="green"
                        icon="fa-envelope"
                        iconStyle={{fontSize: 20, marginHorizontal: 5}}
                        onPress={() => this.sendEmail()}
                        text={service.email}
                        textStyle={{fontSize: 15}}
                    />}
                    {hasWebsite &&
                    <Button
                        buttonStyle={{marginBottom: 5}}
                        color="green"
                        icon="fa-external-link"
                        iconStyle={{fontSize: 20, marginHorizontal: 5}}
                        onPress={() => this.openWebsite()}
                        text={service.website}
                        textStyle={{fontSize: 15}}
                    />}
                    {hasFacebookPage &&
                    <Button
                        buttonStyle={{marginBottom: 5}}
                        color="facebook"
                        icon="fa-facebook-f"
                        iconStyle={{marginHorizontal: 5}}
                        onPress={() => this.findOnFacebook()}
                        text={I18n.t('FIND_US_ON_FACEBOOK')}
                        textStyle={{fontSize: 15}}
                    />}
                    {hasPhoneNumber &&
                    <Button
                        buttonStyle={{marginBottom: 5}}
                        color="black"
                        icon="fa-phone"
                        iconStyle={{marginHorizontal: 5}}
                        onPress={this.call}
                        text={I18n.t('CALL')}
                        textStyle={{fontSize: 15}}
                    />}
                    {SHOW_SHARE_BUTTON &&
                    <Button
                        buttonStyle={{marginBottom: 5}}
                        color="white"
                        icon="fa-share"
                        iconStyle={{marginHorizontal: 5}}
                        onPress={() => this.onShareClick()}
                        text={I18n.t('SHARE')}
                        textStyle={{fontSize: 15}}
                    />}
                </View>
            </ScrollView>
        );
    }
}
const componentStyles = StyleSheet.create({
    sectionIconContainer: {
        width: 50,
        alignItems: 'center'
    },
    sectionIcon: {
        fontSize: 28,
        color: themes.light.greenAccentColor
    },
    sectionHeader: {
        fontSize: 14,
        marginBottom: 2,
        fontWeight: 'bold',
        color: themes.light.textColor
    },
    marker: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
    },
    imageContainer: {
        paddingHorizontal: 10
    },
    image: {
        flexGrow: 1,
        height: 200
    },
    updateTextContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 20
    },
    updateText: {
        fontSize: 12,
        color: themes.light.textColor
    }
});

const mapStateToProps = (state) => {
    return {
        theme: state.theme,
        direction: state.direction,
        region: state.region,
        language: state.language,
        toolbarTitleIcon: state.toolbarTitleIcon,
        toolbarTitleImage: state.toolbarTitleImage
    };
};

export default connect(mapStateToProps)(ServiceDetails);
