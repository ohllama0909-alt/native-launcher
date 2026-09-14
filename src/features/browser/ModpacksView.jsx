import React from 'react';
import BrowseView from './BrowseView.jsx';

export default function ModpacksView(props) {
  return <BrowseView {...props} fixedContentType="modpack" pageTitle="Modpacks" />;
}
