package com.alkhammashtalal.imuslim.media;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The recitation on Android's lock screen (reply 0067; web/src/native/android/media.ts): `update` names what plays and
 * whether it plays, paused or ended; the session's buttons come back as the «action» event (play, pause, next, stop).
 * The service starts with the first «playing» (the user's own press in the app) and ends with «none».
 */
@CapacitorPlugin(name = "RecitationMedia")
public class RecitationMediaPlugin extends Plugin {

    private RecitationService service;
    private boolean binding = false;
    private String[] last = null;

    private final ServiceConnection connection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder binder) {
            service = ((RecitationService.Local) binder).service();
            binding = false;
            if (last != null) service.update(last[0], last[1], last[2], last[3]);
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            service = null;
            binding = false;
        }
    };

    @Override
    public void load() {
        RecitationService.listener = new RecitationService.Listener() {
            @Override
            public void onAction(String action) {
                JSObject e = new JSObject();
                e.put("action", action);
                notifyListeners("action", e);
            }

            @Override
            public void onEnded() {
                unbind(getContext());
            }
        };
    }

    @PluginMethod
    public void update(PluginCall call) {
        String state = call.getString("state", "none");
        Context ctx = getContext();
        if ("none".equals(state)) {
            last = null;
            if (service != null) service.stopNow();
            unbind(ctx);
            call.resolve();
            return;
        }
        last = new String[] { state, call.getString("title", ""), call.getString("artist", ""), call.getString("album", "") };
        if (service != null) {
            service.update(last[0], last[1], last[2], last[3]);
        } else if (!binding) {
            Intent i = new Intent(ctx, RecitationService.class);
            try {
                ContextCompat.startForegroundService(ctx, i);
                binding = ctx.bindService(i, connection, Context.BIND_AUTO_CREATE);
            } catch (RuntimeException e) {
                // Android refused a foreground service now (the app in the background): the sound plays on as before.
                call.reject("not_started");
                return;
            }
        }
        call.resolve();
    }

    private void unbind(Context ctx) {
        if (service == null && !binding) return;
        try {
            ctx.unbindService(connection);
        } catch (IllegalArgumentException e) {
            // already unbound
        }
        service = null;
        binding = false;
    }

    @Override
    protected void handleOnDestroy() {
        RecitationService.listener = null;
        if (service != null) service.stopNow();
        unbind(getContext());
    }
}
