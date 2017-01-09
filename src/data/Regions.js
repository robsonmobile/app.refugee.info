import ApiClient from '../utils/ApiClient';
import {gju} from 'geojson-utils';

export default class Regions {

    constructor(props, context = null) {
        this.client = new ApiClient(context, props);
    }

    static searchImportantInformation(region, fullSlug) {
        let info = region.important_information.filter((info) => {
            return info.full_slug === fullSlug;
        });
        return info[0] || null;
    }

    static searchGeneralInformation(region, fullSlug) {
        let info = region.content.filter((info) => {
            return info.anchor_name === fullSlug;
        });
        return info[0] || null;
    }

    static sortChildren(children, region) {
        if (region) {
            children.sort((a, b) => {
                if (!a.centroid || !b.centroid) {
                    return 0;
                }
                let x = gju.pointDistance(region, a.centroid);
                let y = gju.pointDistance(region, b.centroid);

                return ((x < y) ? -1 : ((x > y) ? 1 : 0));
            });
        }

        return children;
    }
}