package com.alkhammashtalal.imuslim;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.provider.CalendarContract;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * «أضف إلى تقويم الجهاز» on Android (reply 0062; reply 0072 item 14; web/src/native/android/calendar.ts): the calendar
 * app's own «new event» screen, through the system's insert intent (CalendarContract.Events, ACTION_INSERT), filled with
 * the title, the day or its time, and the Hijri date in the description. The person saves it there, with the reminder
 * their calendar app sets. No calendar permission is declared or asked, and nothing of the calendar is read.
 */
@CapacitorPlugin(name = "AndroidCalendar")
public class AndroidCalendarPlugin extends Plugin {

    @PluginMethod
    public void insert(PluginCall call) {
        Long begin = millis(call, "begin");
        Long end = millis(call, "end");
        if (begin == null || end == null) {
            call.reject("begin and end");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_INSERT)
            .setData(CalendarContract.Events.CONTENT_URI)
            .putExtra(CalendarContract.Events.TITLE, call.getString("title", ""))
            .putExtra(CalendarContract.Events.DESCRIPTION, call.getString("notes", ""))
            .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, (long) begin)
            .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, (long) end)
            .putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, Boolean.TRUE.equals(call.getBoolean("allDay", false)));
        JSObject ret = new JSObject();
        try {
            getActivity().startActivity(intent);
            ret.put("opened", true);
        } catch (ActivityNotFoundException e) {
            // No calendar app on the phone: the page says it could not be added.
            ret.put("opened", false);
        }
        call.resolve(ret);
    }

    /** Milliseconds from the page: JSON gives a Long for them (or an Integer or a Double), and PluginCall's getters
     *  each take one kind only. */
    private static Long millis(PluginCall call, String name) {
        Object v = call.getData().opt(name);
        return v instanceof Number ? Long.valueOf(((Number) v).longValue()) : null;
    }
}
