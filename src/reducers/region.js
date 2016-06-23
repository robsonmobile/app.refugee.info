export default (state = null, action) => {
    switch (action.type) {
    case 'REGION_CHANGED':
        if(action.payload && action.payload.metadata) {
          const pageTitle = (action.payload.metadata.page_title || '')
            .replace('\u060c', ',').split(',')[0];
          action.payload.pageTitle = pageTitle;
        }

        return action.payload;
    case 'RECEIVE_REGION':
        if(action.payload && action.payload.metadata) {
          const pageTitle = (action.payload.metadata.page_title || '')
            .replace('\u060c', ',').split(',')[0];
          action.payload.pageTitle = pageTitle;
        }

        return action.payload;
    default:
        return state;
    }
};
