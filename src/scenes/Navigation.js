import React, { Component } from 'react';
import { PropTypes } from 'react-native';

import { Drawer } from 'react-native-material-design';

import I18n from '../constants/Messages';

export default class Navigation extends Component {

    static contextTypes = {
        drawer: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            route: null
        };
    }

    changeScene = (path, name) => {
        const { drawer, navigator } = this.context;

        this.setState({
            route: path
        });
        navigator.to(path, name);
        drawer.closeDrawer();
    };

    render() {
        const { route } = this.state;

        return (
            <Drawer theme="light">
                <Drawer.Section
                    items={[{
                        icon: 'home',
                        value: I18n.t('HOME'),
                        active: !route || route === 'welcome',
                        onPress: () => this.changeScene('welcome'),
                        onLongPress: () => this.changeScene('welcome')
                    }]}
                />

                <Drawer.Section
                    items={[{
                        icon: 'list',
                        value: I18n.t('LIST_SERVICES'),
                        active: route === 'services',
                        onPress: () => this.changeScene('services'),
                        onLongPress: () => this.changeScene('services')
                    }, {
                        icon: 'map',
                        value: I18n.t('EXPLORE_MAP'),
                        active: route === 'map',
                        onPress: () => this.changeScene('map'),
                        onLongPress: () => this.changeScene('map')
                    }, {
                        icon: 'info',
                        value: I18n.t('GENERAL_INFO'),
                        active: route === 'info',
                        onPress: () => this.changeScene('info'),
                        onLongPress: () => this.changeScene('info')
                    }
                    ]}
                    title={I18n.t('REFUGEES_INFO')}
                />

            </Drawer>
        );
    }
}
