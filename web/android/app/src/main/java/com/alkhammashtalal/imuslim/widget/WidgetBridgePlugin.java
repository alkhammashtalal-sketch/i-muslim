package com.alkhammashtalal.imuslim.widget;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

/**
 * The bridge between the app and its widgets (reply 0067), with the iPhone's name and methods (WidgetBridge: write and
 * read; web/src/native/widget-data.ts): the app writes the widgets' data, and the widgets are drawn again at once.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void write(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("no_json");
            return;
        }
        if (!WidgetStore.save(getContext(), json)) {
            call.reject("write_failed");
            return;
        }
        Widgets.updateAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void read(PluginCall call) {
        String json = WidgetStore.readText(getContext());
        JSObject ret = new JSObject();
        ret.put("json", json == null ? JSONObject.NULL : json);
        call.resolve(ret);
    }
}
